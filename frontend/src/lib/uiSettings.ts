export const UI_SETTINGS_KEY = 'margaz_ui_settings_v1';

export interface UiSettings {
    dashboard: {
        defaultView: 'normal' | 'compact';
        refreshSeconds: number;
    };
    thresholds: {
        criticalLevel: number;
        warningLevel: number;
        staleHours: number;
    };
}

export const DEFAULT_UI_SETTINGS: UiSettings = {
    dashboard: {
        defaultView: 'normal',
        refreshSeconds: 30
    },
    thresholds: {
        criticalLevel: 20,
        warningLevel: 50,
        staleHours: 24
    }
};

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

function sanitizeSettings(value: unknown): UiSettings {
    if (!value || typeof value !== 'object') {
        return DEFAULT_UI_SETTINGS;
    }

    const parsed = value as Partial<UiSettings>;

    const defaultView = parsed.dashboard?.defaultView === 'compact' ? 'compact' : 'normal';
    const refreshSeconds = clamp(Number(parsed.dashboard?.refreshSeconds) || DEFAULT_UI_SETTINGS.dashboard.refreshSeconds, 15, 600);

    const critical = clamp(Number(parsed.thresholds?.criticalLevel) || DEFAULT_UI_SETTINGS.thresholds.criticalLevel, 5, 80);
    const warningRaw = clamp(Number(parsed.thresholds?.warningLevel) || DEFAULT_UI_SETTINGS.thresholds.warningLevel, 10, 95);
    const warning = Math.max(warningRaw, critical + 1);
    const staleHours = clamp(Number(parsed.thresholds?.staleHours) || DEFAULT_UI_SETTINGS.thresholds.staleHours, 1, 168);

    return {
        dashboard: {
            defaultView,
            refreshSeconds
        },
        thresholds: {
            criticalLevel: critical,
            warningLevel: warning,
            staleHours
        }
    };
}

export function loadUiSettings(): UiSettings {
    try {
        const raw = localStorage.getItem(UI_SETTINGS_KEY);
        if (!raw) return DEFAULT_UI_SETTINGS;
        return sanitizeSettings(JSON.parse(raw));
    } catch {
        return DEFAULT_UI_SETTINGS;
    }
}

export function saveUiSettings(settings: UiSettings) {
    const sanitized = sanitizeSettings(settings);
    localStorage.setItem(UI_SETTINGS_KEY, JSON.stringify(sanitized));
}
