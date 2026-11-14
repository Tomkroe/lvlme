/**
 * Web-Ersatz für healthkit.ts: Browser haben keinen Zugriff auf Apple Health.
 * Metro nimmt diese Datei im Web statt healthkit.ts, damit das native Modul nicht gebündelt wird.
 */
import { demoProvider } from './demo.ts';

export const healthKitProvider = demoProvider;
