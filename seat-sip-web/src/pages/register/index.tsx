import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, FileText, Image as ImageIcon, Lock, Mail, MapPin, Phone, Store, User, X, QrCode, Laptop, Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type FormState = {
  ownerName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  cafeName: string;
  cafeAddress: string;
  description: string;
  openingHours: string;
  agreedToTerms: boolean;
  infoAccurate: boolean;
  understoodApproval: boolean;
  latitude: number;
  longitude: number;
};

const initialForm: FormState = {
  ownerName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  cafeName: '',
  cafeAddress: '',
  description: '',
  openingHours: '',
  agreedToTerms: false,
  infoAccurate: false,
  understoodApproval: false,
  latitude: 19.0760,
  longitude: 72.8777,
};

export default function CafeOwnerRegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormState>(initialForm);
  const [cafePhotos, setCafePhotos] = useState<File[]>([]);
  const [govtId, setGovtId] = useState<File | null>(null);
  const [businessLicense, setBusinessLicense] = useState<File | null>(null);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [emailCheck, setEmailCheck] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [markerInstance, setMarkerInstance] = useState<any>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isCoarseLocation, setIsCoarseLocation] = useState(false);
  const [addressSearchQuery, setAddressSearchQuery] = useState('');
  const [addressSearchResults, setAddressSearchResults] = useState<any[]>([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.display_name) {
          setFormData(prev => ({ ...prev, cafeAddress: data.display_name }));
        }
      }
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
    }
  };

  const handleSelectAddressResult = (result: any) => {
    const latitude = parseFloat(result.lat);
    const longitude = parseFloat(result.lon);
    setFormData(prev => ({
      ...prev,
      cafeAddress: result.display_name,
      latitude,
      longitude
    }));

    const L = (window as any).L;
    if (mapInstance && markerInstance && L) {
      mapInstance.setView([latitude, longitude], 15);
      markerInstance.setLatLng([latitude, longitude]);
    }

    setAddressSearchResults([]);
    setAddressSearchQuery('');
    setIsCoarseLocation(false);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadLeaflet = () => {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      if (!document.getElementById('leaflet-js')) {
        const script = document.createElement('script');
        script.id = 'leaflet-js';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => {
          initMap();
        };
        document.head.appendChild(script);
      } else if ((window as any).L) {
        initMap();
      }
    };

    const initMap = () => {
      const L = (window as any).L;
      if (!L) return;

      const containerEl = document.getElementById('map-picker');
      if (!containerEl) return;

      const existingContainer = L.DomUtil.get('map-picker');
      if (existingContainer) {
        existingContainer._leaflet_id = null;
      }

      const startLat = formData.latitude || 19.0760;
      const startLng = formData.longitude || 72.8777;

      const m = L.map('map-picker').setView([startLat, startLng], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(m);

      const mk = L.marker([startLat, startLng], { draggable: true }).addTo(m);

      mk.on('dragend', () => {
        const pos = mk.getLatLng();
        setFormData(prev => ({ ...prev, latitude: pos.lat, longitude: pos.lng }));
        setIsCoarseLocation(false);
        reverseGeocode(pos.lat, pos.lng);
      });

      m.on('click', (e: any) => {
        mk.setLatLng(e.latlng);
        setFormData(prev => ({ ...prev, latitude: e.latlng.lat, longitude: e.latlng.lng }));
        setIsCoarseLocation(false);
        reverseGeocode(e.latlng.lat, e.latlng.lng);
      });

      setMapInstance(m);
      setMarkerInstance(mk);
    };

    const timer = setTimeout(() => {
      loadLeaflet();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleDetectLocation = () => {
    if (typeof window === 'undefined') return;
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setFormData(prev => ({ ...prev, latitude, longitude }));
        
        const isCoarse = accuracy > 1000;
        const L = (window as any).L;
        if (mapInstance && markerInstance && L) {
          mapInstance.setView([latitude, longitude], isCoarse ? 12 : 16);
          markerInstance.setLatLng([latitude, longitude]);
        }
        setIsCoarseLocation(isCoarse);
        setIsLocating(false);
        reverseGeocode(latitude, longitude);
      },
      (error) => {
        setIsLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          alert('Location permission denied. Please allow location access in your browser settings to detect your live location, or drag the marker manually.');
        } else {
          alert('Could not retrieve your live location. Please ensure location services are enabled on your device, or drag the marker manually.');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleSearchAddress = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = addressSearchQuery.trim() || formData.cafeAddress.trim();
    if (!query) {
      alert('Please enter an address in the search box or the Cafe Address input first.');
      return;
    }

    setIsSearchingAddress(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
      const data = await response.json();
      setAddressSearchResults(data || []);
      if (!data || data.length === 0) {
        alert('No locations found matching that query. Please refine your search.');
      }
    } catch (error) {
      console.error('Geocoding search failed:', error);
      alert('Error searching for address. Please search manually.');
    } finally {
      setIsSearchingAddress(false);
    }
  };

  const canSubmit = useMemo(() => {
    return Boolean(
      formData.ownerName &&
      formData.email &&
      formData.phone &&
      formData.password.length >= 8 &&
      formData.confirmPassword === formData.password &&
      formData.cafeName &&
      formData.cafeAddress &&
      formData.description &&
      formData.openingHours &&
      cafePhotos.length > 0 &&
      govtId &&
      formData.agreedToTerms &&
      formData.infoAccurate &&
      formData.understoodApproval
    );
  }, [cafePhotos.length, formData, govtId]);

  const updateField = (field: keyof FormState, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEmailBlur = async () => {
    if (!formData.email) return;
    setEmailCheck('Checking email availability...');
    try {
      const response = await fetch(`/api/auth/check-email?email=${encodeURIComponent(formData.email)}`);
      if (response.ok) {
        const result = await response.json();
        setEmailCheck(result.available === false ? 'Email is already registered.' : 'Email is available.');
      } else {
        setEmailCheck('');
      }
    } catch {
      setEmailCheck('');
    }
  };

  const handleCafePhotos = (files: FileList | null) => {
    const selected = Array.from(files || []);
    const valid = selected.filter(file => file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024).slice(0, 5);
    setCafePhotos(valid);
    setPhotoPreviews(valid.map(file => URL.createObjectURL(file)));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!canSubmit) {
      setError('Please complete all required fields and accept all terms.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ownerName: formData.ownerName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        cafeName: formData.cafeName,
        cafeAddress: formData.cafeAddress,
        description: formData.description,
        openingHours: formData.openingHours,
        cafePhotos: cafePhotos.map(photo => photo.name),
        governmentId: govtId?.name || '',
        businessLicense: businessLicense?.name || '',
        termsAccepted: formData.agreedToTerms,
        informationAccurate: formData.infoAccurate,
        approvalRequired: formData.understoodApproval,
        latitude: formData.latitude,
        longitude: formData.longitude,
      };

      const response = await fetch('/api/auth/cafe-owner/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.message || result.error || 'Unable to submit application');
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Unable to submit application');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <main className="relative min-h-screen overflow-hidden px-4 py-10 font-body text-white">
        <div className="cafe-bg-root" />
        <div className="absolute inset-0 bg-black/55" />
        <section className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] max-w-xl items-center">
          <div className="glass-panel w-full rounded-2xl p-8 text-center shadow-2xl">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-200/30 bg-emerald-500/20 text-emerald-100">
              <CheckCircle2 size={34} />
            </div>
            <h1 className="font-headline text-3xl font-black italic tracking-tight">Application Submitted</h1>
            <p className="mt-3 text-sm font-semibold leading-6 text-white/75">
              Your application has been submitted. Please wait for admin&apos;s approval.
              You&apos;ll receive an email at {formData.email} once a decision is made.
            </p>
            <button
              onClick={() => router.push('/login')}
              className="mt-7 inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-black text-stone-950 transition hover:bg-amber-100"
            >
              Back to Login
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-10 font-body text-white">
      <div className="cafe-bg-root" />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(19,12,8,0.28),rgba(19,12,8,0.78))]" />

      <section className="relative z-10 mx-auto w-full max-w-4xl">
        <button
          onClick={() => router.push('/login')}
          className="mb-5 inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white/85 backdrop-blur-xl hover:bg-white/20"
        >
          <ArrowLeft size={16} />
          Login
        </button>
        
        <form onSubmit={handleSubmit} className="glass-panel rounded-2xl p-6 shadow-2xl sm:p-8">
          <div className="mb-8">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/30 bg-white/20 text-amber-100">
              <Store size={28} />
            </div>
            <h1 className="font-headline text-3xl font-black italic tracking-tight">Register Your Cafe</h1>
            <p className="mt-2 text-sm font-semibold text-white/70">Submit a cafe owner application for admin approval.</p>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200/30 bg-red-500/20 p-4 text-red-50">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-200" />
              <p className="text-sm font-semibold">{error}</p>
            </div>
          )}

          <div className="grid gap-8 lg:grid-cols-2">
            <section className="space-y-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-amber-200">Personal Information</h2>
              <Field icon={User} label="Owner Name" value={formData.ownerName} onChange={value => updateField('ownerName', value)} required />
              <Field icon={Mail} label="Email" type="email" value={formData.email} onChange={value => updateField('email', value)} onBlur={handleEmailBlur} required />
              {emailCheck && <p className="text-xs font-bold text-amber-100">{emailCheck}</p>}
              <Field icon={Phone} label="Phone Number" value={formData.phone} onChange={value => updateField('phone', value)} required />
              <Field icon={Lock} label="Password" type="password" value={formData.password} onChange={value => updateField('password', value)} minLength={8} required />
              <Field icon={Lock} label="Confirm Password" type="password" value={formData.confirmPassword} onChange={value => updateField('confirmPassword', value)} required />
              {formData.confirmPassword && formData.confirmPassword !== formData.password && (
                <p className="text-xs font-bold text-red-200">Passwords must match.</p>
              )}
            </section>

            <section className="space-y-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-amber-200">Cafe Information</h2>
              <Field icon={Store} label="Cafe Name" value={formData.cafeName} onChange={value => updateField('cafeName', value)} required />
              <Field icon={MapPin} label="Cafe Address" value={formData.cafeAddress} onChange={value => updateField('cafeAddress', value)} required />
                            {/* Map location picker & Detect Live Location */}
              <div className="space-y-4 p-4 rounded-xl border border-white/10 bg-white/5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-200">Cafe Map Location</span>
                  <button
                    type="button"
                    disabled={isLocating}
                    onClick={handleDetectLocation}
                    className="px-3 py-1.5 rounded-lg border border-amber-200/30 bg-amber-50/50 text-xs font-bold text-amber-200 hover:bg-amber-500/20 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-60"
                  >
                    {isLocating ? (
                      <>
                        <Loader2 size={12} className="animate-spin text-amber-200" />
                        Locating...
                      </>
                    ) : (
                      <>
                        <MapPin size={12} />
                        Detect Live Location
                      </>
                    )}
                  </button>
                </div>

                {/* Search Address Box */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-amber-200/70 uppercase tracking-widest">Search City / Town / Address</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={addressSearchQuery}
                      onChange={(e) => setAddressSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSearchAddress();
                        }
                      }}
                      placeholder="Search e.g. Hubli, Mumbai"
                      className="flex-1 px-4 py-3 border border-white/20 bg-white/10 text-white rounded-lg text-xs font-semibold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all placeholder:text-white/40"
                    />
                    <button
                      type="button"
                      onClick={() => handleSearchAddress()}
                      disabled={isSearchingAddress}
                      className="px-4 py-3 bg-[#74554b] border border-white/10 text-white rounded-lg text-xs font-black hover:bg-[#836359] transition-all disabled:opacity-50"
                    >
                      {isSearchingAddress ? 'Searching...' : 'Search'}
                    </button>
                  </div>

                  {/* Suggestions List Dropdown */}
                  {addressSearchResults.length > 0 && (
                    <ul className="max-h-40 overflow-y-auto border border-white/20 bg-[#1e1b19]/95 backdrop-blur-xl rounded-xl divide-y divide-white/10 shadow-2xl z-20 relative">
                      {addressSearchResults.map((result, idx) => (
                        <li key={idx}>
                          <button
                            type="button"
                            onClick={() => handleSelectAddressResult(result)}
                            className="w-full text-left px-4 py-2.5 hover:bg-white/10 text-white/90 text-xs font-medium transition-all"
                          >
                            {result.display_name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                
                <div id="map-picker" className="h-56 w-full rounded-lg border border-white/10 bg-white/5 overflow-hidden z-10" />

                {isCoarseLocation && (
                  <div className="flex gap-2.5 items-start p-3.5 rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-200 mt-2 text-xs animate-pulse">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                    <div className="text-left font-semibold">
                      <span className="font-bold text-amber-300 block mb-0.5">Approximate Location</span>
                      Your device returned a coarse position. Please type your city/town in the search box above or drag the pin to your exact cafe location.
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4 text-xs font-bold text-white/55">
                  <div className="p-2.5 bg-white/5 rounded-lg border border-white/5">
                    <span className="block text-[9px] uppercase tracking-wider text-white/35">Latitude</span>
                    <span className="text-white/80 font-mono text-sm">{formData.latitude.toFixed(6)}</span>
                  </div>
                  <div className="p-2.5 bg-white/5 rounded-lg border border-white/5">
                    <span className="block text-[9px] uppercase tracking-wider text-white/35">Longitude</span>
                    <span className="text-white/80 font-mono text-sm">{formData.longitude.toFixed(6)}</span>
                  </div>
                </div>
                <p className="text-[10px] text-white/40 leading-normal">
                  Click on the map or drag the marker to pinpoint the exact location of your cafe. The address field will automatically update to reflect the pinned location.
                </p>
              </div>

              <TextArea label="Description" value={formData.description} onChange={value => updateField('description', value.slice(0, 500))} required />
              <Field icon={Phone} label="Opening Hours" value={formData.openingHours} onChange={value => updateField('openingHours', value)} placeholder="9:00 AM - 10:00 PM" required />
              <FileField icon={ImageIcon} label="Cafe Photos" accept="image/*" multiple onChange={handleCafePhotos} required />
              {photoPreviews.length > 0 && (
                <div className="grid grid-cols-5 gap-2">
                  {photoPreviews.map((src, index) => (
                    <img key={src} src={src} alt={`Cafe photo ${index + 1}`} className="h-16 w-full rounded-lg object-cover" />
                  ))}
                </div>
              )}
            </section>
          </div>

          <section className="mt-8 space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-amber-200">Documents</h2>
            <div className="grid gap-4 lg:grid-cols-2">
              <FileField icon={FileText} label="Government ID" accept="image/*,.pdf,application/pdf" onChange={files => setGovtId(files?.[0] || null)} required />
              <FileField icon={FileText} label="Business License (optional)" accept="image/*,.pdf,application/pdf" onChange={files => setBusinessLicense(files?.[0] || null)} />
            </div>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-xs font-black uppercase tracking-widest text-amber-200">Terms & Conditions</h2>
            <Check label="I agree to the platform rules and policies" checked={formData.agreedToTerms} onChange={checked => updateField('agreedToTerms', checked)} />
            <Check label="All information provided is accurate and truthful" checked={formData.infoAccurate} onChange={checked => updateField('infoAccurate', checked)} />
            <Check label="I understand that my account requires admin approval before activation" checked={formData.understoodApproval} onChange={checked => updateField('understoodApproval', checked)} />
          </section>

          <button
            type="submit"
            disabled={loading || !canSubmit}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#74554b] to-[#5d4037] px-4 py-3 font-black text-white shadow-lg transition hover:from-[#836359] hover:to-[#694b42] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Submitting...' : 'Submit Application'}
          </button>
        </form>
      </section>


    </main>
  );
}

type FieldProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
};

function Field({ icon: Icon, label, value, onChange, onBlur, type = 'text', placeholder, required = false, minLength }: FieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';

  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-white/90">{label}</span>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60" />
        <input
          type={isPassword && showPassword ? 'text' : type}
          required={required}
          minLength={minLength}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          className={`w-full rounded-lg border border-white/25 bg-white/15 py-3 pl-10 text-white outline-none backdrop-blur-xl transition placeholder:text-white/45 focus:border-amber-200/70 focus:ring-4 focus:ring-amber-200/20 ${isPassword ? 'pr-12' : 'pr-4'}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(prev => !prev)}
            className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-white/65 transition hover:bg-white/10 hover:text-white"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </label>
  );
}

type FileFieldProps = {
  icon: LucideIcon;
  label: string;
  accept: string;
  multiple?: boolean;
  required?: boolean;
  onChange: (files: FileList | null) => void;
};

function FileField({ icon: Icon, label, accept, multiple = false, required = false, onChange }: FileFieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-white/90">{label}</span>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60" />
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          required={required}
          onChange={(event) => onChange(event.target.files)}
          className="w-full rounded-lg border border-white/25 bg-white/15 py-3 pl-10 pr-4 text-sm text-white outline-none backdrop-blur-xl file:mr-4 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-stone-900 focus:border-amber-200/70 focus:ring-4 focus:ring-amber-200/20"
        />
      </div>
      {multiple && <p className="mt-1 text-xs font-semibold text-white/55">Maximum 5 images, 5MB each.</p>}
    </label>
  );
}

type TextAreaProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
};

function TextArea({ label, value, onChange, required = false }: TextAreaProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-white/90">{label}</span>
      <textarea
        value={value}
        required={required}
        maxLength={500}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        className="w-full rounded-lg border border-white/25 bg-white/15 px-4 py-3 text-white outline-none backdrop-blur-xl transition placeholder:text-white/45 focus:border-amber-200/70 focus:ring-4 focus:ring-amber-200/20"
      />
      <p className="mt-1 text-right text-xs font-semibold text-white/55">{value.length}/500</p>
    </label>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 rounded-lg border border-white/15 bg-white/10 p-3 text-sm font-semibold text-white/85">
      <input
        type="checkbox"
        required
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-amber-200"
      />
      {label}
    </label>
  );
}
