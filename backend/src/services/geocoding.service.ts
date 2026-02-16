import axios from 'axios';
import prisma from '../lib/prisma';


export class GeocodingService {
    private static readonly NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

    // Rate limiting: 1 request per second to respect Nominatim usage policy
    private static async delay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async geocodeAddress(address: string, district: string, city: string) {
        try {
            // Clean address: Remove Ada, Pafta, Parsel info which confuses Nominatim
            // Example: "X Mah. Y Cad. No:5 (Ada:123, Parsel:4)" -> "X Mah. Y Cad. No:5"
            const cleanAddress = address
                .replace(/\(.*\)/g, '') // Remove content in parentheses
                .replace(/(Ada|Pafta|Parsel)\s*[:\d\w]+/gi, '') // Remove Ada/Pafta/Parsel
                .replace(/\s+/g, ' ') // Remove extra spaces
                .trim();

            // Construct a structured query
            // Prefer City + District first for better accuracy if address is messy
            const query = `${cleanAddress}, ${district}, ${city}, Turkey`;
            console.log(`Querying: ${query}`); // Debug log

            const response = await axios.get(GeocodingService.NOMINATIM_URL, {
                params: {
                    q: query,
                    format: 'json',
                    limit: 1
                },
                headers: {
                    'User-Agent': 'MargazKontrol/1.0 (ardab@example.com)' // Required by Nominatim
                }
            });

            if (response.data && response.data.length > 0) {
                return {
                    lat: parseFloat(response.data[0].lat),
                    lon: parseFloat(response.data[0].lon)
                };
            }
            return null;
        } catch (error) {
            console.error('Geocoding error:', error);
            return null;
        }
    }

    async updateAllDealerCoordinates() {
        console.log('Starting geocoding process...');
        const dealers = await prisma.dealer.findMany({
            where: {
                latitude: null
            }
        });

        console.log(`Found ${dealers.length} dealers without coordinates.`);

        for (const dealer of dealers) {
            if (!dealer.city || !dealer.district) continue;

            console.log(`Geocoding: ${dealer.title} (${dealer.city}/${dealer.district})`);

            // Try specific address first
            let coords = await this.geocodeAddress(dealer.address || '', dealer.district, dealer.city);

            // Fallback to District + City if specific address fails
            if (!coords) {
                console.log('  > Address failed, trying district...');
                coords = await this.geocodeAddress('', dealer.district, dealer.city);
            }

            if (coords) {
                await prisma.dealer.update({
                    where: { id: dealer.id },
                    data: {
                        latitude: coords.lat,
                        longitude: coords.lon
                    }
                });
                console.log(`  > Updated: ${coords.lat}, ${coords.lon}`);
            } else {
                console.log('  > Could not find coordinates.');
            }

            // Respect rate limit (1s)
            await GeocodingService.delay(1100);
        }
        console.log('Geocoding complete.');
    }
}
