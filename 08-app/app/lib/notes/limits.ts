// Limits shared by the browser and the server.
// About 4 minutes at 64 kbps (recording stops at 3). Vercel refuses request bodies over 4.5 MB.
export const MAX_AUDIO_BYTES = 4 * 1024 * 1024;
export const AUDIO_TOO_LARGE = "Η ηχογράφηση είναι πολύ μεγάλη (έως 4 MB, περίπου 4 λεπτά).";
