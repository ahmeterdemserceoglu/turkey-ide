/**
 * Basit bir event bus implementasyonu
 * Bileşenler arası iletişim için kullanılır
 */

type EventCallback = (...args: any[]) => void;

class EventBus {
    private events: Record<string, EventCallback[]> = {};

    /**
     * Belirli bir olayı dinler
     * @param event Olay adı
     * @param callback Olay gerçekleştiğinde çağrılacak fonksiyon
     */
    on(event: string, callback: EventCallback): void {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    /**
     * Bir olayın dinlenmesini durdurur
     * @param event Olay adı
     * @param callback Kaldırılacak callback fonksiyonu
     */
    off(event: string, callback: EventCallback): void {
        if (!this.events[event]) return;

        const index = this.events[event].indexOf(callback);
        if (index !== -1) {
            this.events[event].splice(index, 1);
        }
    }

    /**
     * Bir olayı tetikler
     * @param event Olay adı
     * @param args Olay ile birlikte gönderilecek argümanlar
     */
    emit(event: string, ...args: any[]): void {
        if (!this.events[event]) return;

        this.events[event].forEach(callback => {
            try {
                callback(...args);
            } catch (error) {
                console.error(`Error in event listener for ${event}:`, error);
            }
        });
    }

    /**
     * Tüm olayları ve dinleyicileri temizler
     */
    clear(): void {
        this.events = {};
    }

    /**
     * Belirli bir olayın tüm dinleyicilerini temizler
     * @param event Olay adı
     */
    clearEvent(event: string): void {
        delete this.events[event];
    }
}

// Singleton olarak export et
export const eventBus = new EventBus(); 