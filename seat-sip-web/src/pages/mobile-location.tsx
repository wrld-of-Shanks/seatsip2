import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { MapPin, Navigation, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

export default function MobileLocationPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'locating' | 'submitting' | 'success' | 'error'>('idle');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (router.isReady) {
      const session = router.query.session as string;
      if (session) {
        setSessionId(session);
      } else {
        setStatus('error');
        setErrorMessage('Invalid session. Please scan the QR code again.');
      }
    }
  }, [router.isReady, router.query]);

  // Auto trigger sync on sessionId load
  useEffect(() => {
    if (!sessionId) return;
    handleSyncLocation();
  }, [sessionId]);

  const fetchIPLocation = async () => {
    try {
      // Try freeipapi.com first
      try {
        const res = await fetch('https://freeipapi.com/api/json');
        if (res.ok) {
          const data = await res.json();
          if (data.latitude && data.longitude) {
            const lat = parseFloat(data.latitude);
            const lng = parseFloat(data.longitude);
            setCoords({ latitude: lat, longitude: lng });
            await submitCoordinates(lat, lng, 'ip');
            return;
          }
        }
      } catch (e) {
        console.warn('freeipapi.com fetch failed:', e);
      }

      // If that fails, try ipapi.co secondary backup
      try {
        const res = await fetch('https://ipapi.co/json/');
        if (res.ok) {
          const data = await res.json();
          if (data.latitude && data.longitude) {
            const lat = parseFloat(data.latitude);
            const lng = parseFloat(data.longitude);
            setCoords({ latitude: lat, longitude: lng });
            await submitCoordinates(lat, lng, 'ip');
            return;
          }
        }
      } catch (e) {
        console.warn('ipapi.co fetch failed:', e);
      }

      throw new Error('All geolocation sources failed.');
    } catch (err: any) {
      setStatus('error');
      setErrorMessage('Could not retrieve your live location automatically. Please try again or refine it on your desktop.');
    }
  };

  const handleSyncLocation = () => {
    if (!sessionId) {
      setStatus('error');
      setErrorMessage('Missing sync session. Please try scanning the QR code again.');
      return;
    }

    setStatus('locating');
    setErrorMessage('');

    if (!navigator.geolocation) {
      fetchIPLocation();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ latitude, longitude });
        submitCoordinates(latitude, longitude, 'gps');
      },
      (error) => {
        console.warn('Browser GPS failed, trying IP fallback:', error);
        fetchIPLocation();
      },
      {
        enableHighAccuracy: true,
        timeout: 15000, // 15 seconds lock window
        maximumAge: 0,
      }
    );
  };

  const submitCoordinates = async (latitude: number, longitude: number, source: 'gps' | 'ip') => {
    setStatus('submitting');
    try {
      const response = await fetch(`/api/auth/mobile-location/session/${sessionId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude, source }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to sync location to backend.');
      }

      setStatus('success');
    } catch (error: any) {
      setStatus('error');
      setErrorMessage(error.message || 'Failed to submit coordinates. Please try again.');
    }
  };

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-amber-950 flex flex-col items-center justify-center p-6 text-white font-sans overflow-hidden">
      {/* Dynamic Background Coffee Aura */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-amber-700/10 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-48 h-48 rounded-full bg-stone-500/5 blur-[60px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
        {/* Logo/Icon Area */}
        <div className="relative mb-8 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-amber-500/20 blur-xl animate-pulse" />
          <div className="relative w-20 h-20 bg-stone-900/80 border border-white/10 rounded-2xl flex items-center justify-center shadow-xl backdrop-blur-md">
            {status === 'success' ? (
              <CheckCircle2 size={40} className="text-emerald-400 animate-[scaleIn_0.3s_ease-out]" />
            ) : status === 'locating' || status === 'submitting' ? (
              <Loader2 size={36} className="text-amber-400 animate-spin" />
            ) : status === 'error' ? (
              <AlertTriangle size={36} className="text-rose-400" />
            ) : (
              <MapPin size={36} className="text-amber-500 animate-bounce" />
            )}
          </div>
        </div>

        {/* Text Area */}
        <div className="text-center mb-8 px-2">
          <h1 className="text-2xl font-black italic font-headline tracking-tight text-white mb-2">
            SeatSip GPS Sync
          </h1>
          <p className="text-xs font-semibold text-stone-300/80 leading-relaxed">
            {status === 'success'
              ? 'Coordinates successfully synchronized with your desktop browser!'
              : status === 'locating'
              ? 'Detecting your live coordinates...'
              : status === 'submitting'
              ? 'Synchronizing GPS data with your registration session...'
              : 'Sync coordinates from this device back to your desktop in real-time.'}
          </p>
        </div>

        {/* Action Panel */}
        <div className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl shadow-2xl space-y-4">
          {status === 'success' ? (
            <div className="text-center space-y-3 py-4">
              <span className="inline-block px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[10px] font-black uppercase tracking-widest text-emerald-300">
                Synced Successfully
              </span>
              <p className="text-xs text-stone-400/90 leading-normal font-semibold">
                You can now safely close this browser tab. Your desktop window has updated.
              </p>
              {coords && (
                <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-2 text-[10px] font-mono text-stone-500">
                  <div className="p-2 bg-stone-950/40 rounded-lg">
                    <span className="block text-[8px] uppercase text-stone-600 font-bold mb-0.5">Latitude</span>
                    <span className="text-stone-300">{coords.latitude.toFixed(6)}</span>
                  </div>
                  <div className="p-2 bg-stone-950/40 rounded-lg">
                    <span className="block text-[8px] uppercase text-stone-600 font-bold mb-0.5">Longitude</span>
                    <span className="text-stone-300">{coords.longitude.toFixed(6)}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 text-center">
              {errorMessage && (
                <div className="flex gap-2.5 items-start p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-200 text-left">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <p className="text-xs font-bold leading-normal">{errorMessage}</p>
                </div>
              )}

              {status === 'error' && (
                <button
                  type="button"
                  onClick={handleSyncLocation}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-4 text-xs font-black uppercase tracking-wider text-white shadow-lg transition active:scale-95 hover:from-amber-400 hover:to-amber-500"
                >
                  <Navigation size={16} />
                  Retry Sync Geolocation
                </button>
              )}

              {status !== 'error' && (
                <div className="flex flex-col items-center justify-center py-6 gap-3">
                  <Loader2 className="animate-spin text-amber-500" size={32} />
                  <span className="text-xs font-bold text-stone-300">Retrieving sensor data...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <p className="mt-8 text-[10px] text-stone-500 font-semibold text-center leading-normal max-w-[240px]">
          Ensures 100% accurate coordinate alignment without sharing browser/device location on desktop.
        </p>
      </div>
    </main>
  );
}
