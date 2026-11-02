/**
 * Theme Switcher (Dark / Light / System Mode)
 * Default: Mengikuti tema bawaan device / sistem (prefers-color-scheme)
 * Fitur:
 * - Pengecekan otomatis preferensi tema perangkat (Dark / Light) secara default
 * - Live listener: otomatis menyesuaikan jika pengguna mengubah tema OS secara realtime
 * - Anti-FOUC (Flash of Unstyled Content) dengan MutationObserver instan pada body
 * - Penyimpanan preferensi manual di localStorage (dengan penanganan aman try-catch)
 * - Dukungan reset ke tema bawaan perangkat (double-click pada tombol toggle)
 * - Sinkronisasi lintas tab secara realtime
 */

(function () {
    const STORAGE_KEY = 'portfolio_theme';
    const LEGACY_STORAGE_KEY = 'theme';

    // 1. Bersihkan key legacy dari sesi sebelumnya jika ada agar default murni mengikuti device
    try {
        if (localStorage.getItem(LEGACY_STORAGE_KEY) && !localStorage.getItem(STORAGE_KEY)) {
            localStorage.removeItem(LEGACY_STORAGE_KEY);
        }
    } catch (_) {}

    /**
     * Memeriksa preferensi tema bawaan sistem / device
     * @returns {'dark' | 'light'}
     */
    function getSystemTheme() {
        try {
            if (typeof window !== 'undefined' && window.matchMedia) {
                if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    return 'dark';
                }
                if (window.matchMedia('(prefers-color-scheme: light)').matches) {
                    return 'light';
                }
            }
        } catch (e) {
            console.warn('[Theme] Gagal membaca prefers-color-scheme:', e);
        }
        return 'light'; // Fallback aman
    }

    /**
     * Mengambil tema manual yang tersimpan (jika pernah dipilih oleh pengguna)
     * @returns {'dark' | 'light' | null}
     */
    function getSavedThemePreference() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved === 'dark' || saved === 'light') {
                return saved;
            }
        } catch (_) {}
        return null; // null menandakan belum ada override manual (ikuti device)
    }

    /**
     * Menentukan tema aktif saat ini:
     * Jika ada pilihan manual -> pakai pilihan manual.
     * Jika belum ada pilihan manual (default) -> ikuti sistem bawaan device.
     */
    function resolveTheme() {
        const saved = getSavedThemePreference();
        if (saved) {
            return {
                theme: saved,
                isManual: true
            };
        }
        return {
            theme: getSystemTheme(),
            isManual: false
        };
    }

    /**
     * Terapkan class dan attribute ke documentElement & body secara instan
     * @param {'dark' | 'light'} theme
     */
    function applyDOMTheme(theme) {
        const isDark = theme === 'dark';

        if (isDark) {
            document.documentElement.classList.add('dark-mode');
            document.documentElement.setAttribute('data-theme', 'dark');
            if (document.body) {
                document.body.classList.add('dark-mode');
                document.body.setAttribute('data-theme', 'dark');
            }
        } else {
            document.documentElement.classList.remove('dark-mode');
            document.documentElement.setAttribute('data-theme', 'light');
            if (document.body) {
                document.body.classList.remove('dark-mode');
                document.body.setAttribute('data-theme', 'light');
            }
        }
    }

    // 2. Eksekusi instan pada documentElement (dalam <head>) untuk cegah flash putih
    const initial = resolveTheme();
    applyDOMTheme(initial.theme);

    // Pantau kemunculan <body> seawal mungkin via MutationObserver
    // Ini memastikan <body> langsung memiliki class 'dark-mode' sebelum konten apa pun digambar
    if (document.body) {
        applyDOMTheme(initial.theme);
    } else {
        const bodyObserver = new MutationObserver(function () {
            if (document.body) {
                applyDOMTheme(initial.theme);
                bodyObserver.disconnect();
            }
        });
        bodyObserver.observe(document.documentElement, { childList: true });
    }

    /**
     * Menampilkan notifikasi toast mini saat berpindah mode
     * @param {string} message
     */
    function showThemeToast(message) {
        let toast = document.getElementById('theme-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'theme-toast';
            toast.style.cssText = `
                position: fixed;
                bottom: 25px;
                left: 50%;
                transform: translateX(-50%) translateY(30px);
                background: rgba(15, 23, 42, 0.95);
                color: #f8fafc;
                padding: 10px 20px;
                border-radius: 30px;
                font-size: 13px;
                font-family: 'Poppins', sans-serif;
                font-weight: 500;
                box-shadow: 0 10px 25px rgba(0,0,0,0.4);
                border: 1px solid rgba(255,255,255,0.15);
                z-index: 100000;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.3s ease, transform 0.3s ease;
                display: flex;
                align-items: center;
                gap: 8px;
            `;
            document.body.appendChild(toast);
        }

        toast.innerHTML = message;
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';

        if (window._themeToastTimer) {
            clearTimeout(window._themeToastTimer);
        }
        window._themeToastTimer = setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(30px)';
        }, 2200);
    }

    /**
     * Perbarui tampilan tombol toggle (ikon, title, aria-label)
     * @param {'dark' | 'light'} currentTheme
     * @param {boolean} isManual
     */
    function updateToggleUI(currentTheme, isManual) {
        const isDark = currentTheme === 'dark';
        const toggleBtns = document.querySelectorAll('#theme-toggle, .theme-toggle');

        toggleBtns.forEach(btn => {
            const nextModeText = isDark ? 'Mode Terang' : 'Mode Gelap';
            const statusText = isManual ? '(Pilihan Manual)' : '(Bawaan Perangkat)';

            btn.setAttribute('aria-label', `Ganti ke ${nextModeText}`);
            btn.setAttribute(
                'title',
                `Tema saat ini: ${isDark ? 'Gelap' : 'Terang'} ${statusText}\n• Klik untuk beralih ke ${nextModeText}\n• Double-klik untuk reset ke tema bawaan device`
            );

            const icon = btn.querySelector('i');
            if (icon) {
                if (isDark) {
                    icon.classList.remove('fa-moon');
                    icon.classList.add('fa-sun');
                } else {
                    icon.classList.remove('fa-sun');
                    icon.classList.add('fa-moon');
                }
            }
        });
    }

    /**
     * Terapkan tema baru
     * @param {'dark' | 'light'} theme
     * @param {boolean} saveManual
     */
    function setTheme(theme, saveManual = true) {
        applyDOMTheme(theme);

        if (saveManual) {
            try {
                localStorage.setItem(STORAGE_KEY, theme);
            } catch (_) {}
            updateToggleUI(theme, true);
        } else {
            try {
                localStorage.removeItem(STORAGE_KEY);
            } catch (_) {}
            updateToggleUI(theme, false);
        }
    }

    /**
     * Reset tema kembali ke preferensi bawaan device
     */
    function resetToSystemTheme() {
        try {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(LEGACY_STORAGE_KEY);
        } catch (_) {}

        const systemTheme = getSystemTheme();
        setTheme(systemTheme, false);
        showThemeToast('<i class="fas fa-magic"></i> Tema kembali mengikuti setelan bawaan perangkat');
        console.log('[Theme] Reset ke preferensi bawaan device:', systemTheme);
    }

    // 3. Inisialisasi UI dan event handler saat DOM siap
    function initThemeUI() {
        const current = resolveTheme();
        applyDOMTheme(current.theme);
        updateToggleUI(current.theme, current.isManual);

        console.log(
            `[Theme] Mode aktif: ${current.theme.toUpperCase()} ` +
            `(${current.isManual ? 'Pilihan Manual Pengguna' : 'Mengikuti Setelan Device'})`
        );

        const toggleBtns = document.querySelectorAll('#theme-toggle, .theme-toggle');
        toggleBtns.forEach(btn => {
            // Klik normal: beralih tema Dark <-> Light
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                const nowDark = document.documentElement.classList.contains('dark-mode') ||
                                (document.body && document.body.classList.contains('dark-mode'));
                const nextTheme = nowDark ? 'light' : 'dark';

                btn.classList.add('animating');
                setTimeout(() => btn.classList.remove('animating'), 500);

                setTheme(nextTheme, true);
                showThemeToast(
                    nextTheme === 'dark'
                        ? '<i class="fas fa-moon"></i> Beralih ke Mode Gelap'
                        : '<i class="fas fa-sun"></i> Beralih ke Mode Terang'
                );
            });

            // Double-klik: reset ke tema bawaan perangkat
            btn.addEventListener('dblclick', function (e) {
                e.preventDefault();
                resetToSystemTheme();
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initThemeUI);
    } else {
        initThemeUI();
    }

    // 4. Deteksi Realtime Perubahan Tema Device / OS
    // Jika pengguna mengubah mode di pengaturan sistem, website langsung menyesuaikan seketika
    if (typeof window !== 'undefined' && window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleSystemThemeChange = function (e) {
            const hasManual = getSavedThemePreference() !== null;
            if (!hasManual) {
                const newSystemTheme = e.matches ? 'dark' : 'light';
                console.log('[Theme] Deteksi perubahan tema sistem device:', newSystemTheme);
                applyDOMTheme(newSystemTheme);
                updateToggleUI(newSystemTheme, false);
                showThemeToast(
                    newSystemTheme === 'dark'
                        ? '<i class="fas fa-laptop"></i> Sistem perangkat beralih ke Mode Gelap'
                        : '<i class="fas fa-laptop"></i> Sistem perangkat beralih ke Mode Terang'
                );
            }
        };

        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleSystemThemeChange);
        } else if (mediaQuery.addListener) {
            mediaQuery.addListener(handleSystemThemeChange);
        }
    }

    // 5. Sinkronisasi antar Tab
    window.addEventListener('storage', function (e) {
        if (e.key === STORAGE_KEY || e.key === LEGACY_STORAGE_KEY) {
            const updated = resolveTheme();
            applyDOMTheme(updated.theme);
            updateToggleUI(updated.theme, updated.isManual);
        }
    });

    // 6. Ekspos API publik opsional untuk keperluan pengujian / developer console
    window.portfolioTheme = {
        getTheme: () => resolveTheme().theme,
        isManual: () => resolveTheme().isManual,
        getSystemTheme: getSystemTheme,
        setTheme: (t) => setTheme(t, true),
        resetToSystem: resetToSystemTheme
    };
})();
