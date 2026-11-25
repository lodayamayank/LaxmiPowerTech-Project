import React, { useState, useEffect, useRef, useCallback } from "react";
import { ROUTES } from '@/lib/routes';
import { getToken, getUser, storeUser } from '@/lib/session';
import { useNavigate } from "react-router-dom";
import axios from "@/api/client";
import { readPunchStatus, writePunchStatus } from "@/lib/punchStatusCache";
import useNotifier from "@/pwa/useNotifier";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Notice } from '@/components/common/Notice';
import { IconTile } from '@/components/common/IconTile';
import { PageLoader } from '@/components/common/PageLoader';
import MobileCard from '@/layouts/mobile/MobileCard';
import MobilePage from '@/layouts/mobile/MobilePage';
import { GoogleMap, MarkerF, CircleF, useJsApiLoader } from "@react-google-maps/api";
import { Building2, CircleCheck, Fingerprint, LogOut, MapPin, MapPinOff, RefreshCw, TriangleAlert } from "lucide-react";

// --- utils (unchanged) ---
// The map circle takes a literal colour, so read the attendance "present" colour token from the theme.
const GEOFENCE_COLOR = typeof window === "undefined" ? "green" : `hsl(${getComputedStyle(document.documentElement).getPropertyValue("--chart-present").trim() || "162 52% 43%"})`;

const getDistanceMeters = (lat1, lng1, lat2, lng2) => {
  const toRad = (val) => (val * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const MAP_STYLE = { height: "350px", width: "100%" };
const DEFAULT_ZOOM = 17;

const PunchInScreen = () => {
  const notifier = useNotifier();

  const [user, setUser] = useState(null);
  const [location, setLocation] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [punchStatus, setPunchStatus] = useState({
    punchedIn: false,
    punchedOut: false,
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [nearestBranch, setNearestBranch] = useState(null);
  const [branchDistance, setBranchDistance] = useState(null);

  const mapRef = useRef(null);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 2;
  const navigate = useNavigate();

  // Load Google Maps
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  const recenter = useCallback((lat, lng) => {
    if (mapRef.current && lat && lng) {
      mapRef.current.panTo({ lat, lng });
      mapRef.current.setZoom(DEFAULT_ZOOM);
    }
  }, []);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate nearest branch and distance
  useEffect(() => {
    if (location && user?.assignedBranches?.length) {
      const { lat, lng } = location;
      let minDistance = Infinity;
      let nearest = null;

      user.assignedBranches.forEach((branch) => {
        const d = getDistanceMeters(lat, lng, branch.lat, branch.lng);
        if (d < minDistance) {
          minDistance = d;
          nearest = branch;
        }
      });

      setNearestBranch(nearest);
      setBranchDistance(Math.round(minDistance));
    }
  }, [location, user]);

  const getLocation = (isManualRefresh = false) => {
    setLoadingLocation(true);
    if (isManualRefresh) retryCountRef.current = 0;

    const onSuccess = (pos) => {
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setLocation(loc);
      setLoadingLocation(false);
      recenter(loc.lat, loc.lng);
      retryCountRef.current = 0;
    };

    const tryLowAccuracy = () => {
      navigator.geolocation.getCurrentPosition(
        onSuccess,
        () => {
          if (retryCountRef.current < MAX_RETRIES) {
            retryCountRef.current += 1;
            setTimeout(() => getLocation(), 1500);
          } else {
            notifier.error("Failed to fetch location. Please check GPS settings and try again.");
            setLoadingLocation(false);
            retryCountRef.current = 0;
          }
        },
        { enableHighAccuracy: false, maximumAge: 60000, timeout: 10000 }
      );
    };

    navigator.geolocation.getCurrentPosition(
      onSuccess,
      () => {
        tryLowAccuracy();
      },
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 20000 }
    );
  };

  // Read the copy of the user saved at login. This screen has to render without
  // a network round-trip, otherwise it sits on "Loading user..." forever on a
  // site with no signal — which is exactly when someone needs to punch.
  const readCachedUser = () => {
    try {
      return getUser();
    } catch {
      return null;
    }
  };

  const fetchUser = async () => {
    const cached = readCachedUser();
    if (cached) setUser(cached);

    try {
      const res = await axios.get("/auth/me", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setUser(res.data.user);
      // Keep the offline copy current, including branch assignments/radii.
      storeUser(res.data.user);
    } catch (err) {
      console.error(err);
      // Only a genuine problem if we have nothing cached to fall back on.
      if (!cached) {
        notifier.error("Failed to load user. Please connect to the internet and log in again.");
      }
    }
  };

  const fetchPunchStatus = async () => {
    // Start from the local record so a punch queued offline is reflected
    // immediately and the user is not invited to punch in twice.
    const cached = readPunchStatus();
    if (cached) setPunchStatus(cached);

    try {
      const res = await axios.get("/attendance/today", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const status = {
        punchedIn: res.data.punchedIn || cached?.punchedIn || false,
        punchedOut: res.data.punchedOut || cached?.punchedOut || false,
      };
      setPunchStatus(status);
      writePunchStatus(status);
    } catch (err) {
      console.error("Failed to fetch punch status", err);
    }
  };

  const handlePunchClick = async (type) => {
    if (!location || !user?.assignedBranches?.length) {
      notifier.error("Missing location or branch assignment.");
      return;
    }
    const { lat, lng } = location;

    const nearbyBranch = user.assignedBranches.find((branch) => {
      const d = getDistanceMeters(lat, lng, branch.lat, branch.lng);
      return d <= branch.radius;
    });

    if (!nearbyBranch) {
      notifier.error("You are not within any of your assigned branch locations.");
      return;
    }

    // Offline is not a special case here any more: the selfie screen queues the
    // complete punch (selfie included) through the sync engine. Short-circuiting
    // to a local queue at this point is what used to drop the punch entirely,
    // since a punch with no selfie is not something the backend can accept.
    navigate(ROUTES.selfie, {
      state: {
        punchType: type,
        location: { lat, lng },
        branchId: nearbyBranch._id,
        branchName: nearbyBranch.name,
        timestamp: new Date().toISOString(),
      },
    });
  };

  useEffect(() => {
    fetchUser();
    getLocation();
    fetchPunchStatus();

    // Queued punches are drained by syncEngine, which App.jsx starts once for
    // the whole app. This screen used to register a second 'online' listener of
    // its own, which meant reconnecting fired two concurrent syncs of the same
    // queue. Refreshing the server-side status is all that is needed here.
    const handleOnline = () => fetchPunchStatus();
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  const isWithinRange = branchDistance !== null && nearestBranch && branchDistance <= nearestBranch.radius;
  const done = punchStatus.punchedIn && punchStatus.punchedOut;
  const nextType = !punchStatus.punchedIn ? "in" : "out";
  const online = navigator.onLine;
  const [showMap, setShowMap] = useState(false);

  if (!user) {
    return <PageLoader label="Loading your profile" />;
  }

  return (
    <MobilePage
      title="Mark attendance"
      back
      onBack={() => navigate(-1)}
      right={
        <Badge variant={online ? "ok" : "bad"} className="gap-1.5">
          <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
          {online ? "Online" : "Offline"}
        </Badge>
      }
      footer={
        <Button size="xl" className="w-full" disabled={done || !isWithinRange || !location} onClick={() => handlePunchClick(nextType)}>
          {done ? <CircleCheck /> : nextType === "in" ? <Fingerprint /> : <LogOut />}
          {done ? "Attendance complete for today" : nextType === "in" ? "Take selfie & punch in" : "Take selfie & punch out"}
        </Button>
      }
    >
      <div className="text-center">
        <div className="text-[30px] font-semibold tabular-nums text-primary">
          {currentTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase()}
        </div>
        <div className="text-small text-ink-3">{currentTime.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
      </div>

      {nearestBranch && branchDistance !== null && !isWithinRange ? (
        <Notice tone="bad" icon={TriangleAlert} role="alert">
          <b>You&apos;re outside the site.</b> About {branchDistance} m from {nearestBranch.name}. You need to be within {nearestBranch.radius} m.
        </Notice>
      ) : null}

      <MobileCard className="flex items-center gap-3">
        <IconTile icon={isWithinRange ? MapPin : MapPinOff} tone={isWithinRange ? "ok" : loadingLocation ? "neutral" : "warn"} className="size-10" />
        <div className="min-w-0 flex-1">
          <div className="text-[14.5px] font-semibold text-ink-1">
            {nearestBranch && branchDistance !== null
              ? `${isWithinRange ? "Inside" : "Outside"} ${nearestBranch.name}`
              : loadingLocation
                ? "Finding your location…"
                : location
                  ? "No assigned site found"
                  : "Location unavailable"}
          </div>
          <div className="text-small text-ink-3">
            {nearestBranch && branchDistance !== null
              ? `${branchDistance} m away · ${isWithinRange ? "within geofence" : `geofence ${nearestBranch.radius} m`}`
              : location
                ? "Ask your supervisor to assign you to a site."
                : "Turn on location to mark attendance."}
          </div>
        </div>
        {nearestBranch && branchDistance !== null ? <Badge variant={isWithinRange ? "ok" : "warn"}>{isWithinRange ? "OK" : "Outside"}</Badge> : null}
      </MobileCard>

      <Button type="button" variant="outline" className="!h-12" onClick={() => getLocation(true)} disabled={loadingLocation}>
        <RefreshCw className={loadingLocation ? "animate-spin" : ""} /> {loadingLocation ? "Checking location…" : "Check my location again"}
      </Button>

      <div className="flex items-center justify-between rounded-[14px] border border-line-card bg-surface p-3 text-small text-ink-3">
        <span className="inline-flex items-center gap-2">
          <Building2 className="size-4" />
          {punchStatus.punchedIn && !punchStatus.punchedOut ? "Punched in · you are at work" : done ? "Completed · attendance marked" : "Not punched in yet"}
        </span>
        <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={() => setShowMap((v) => !v)}>
          {showMap ? "Hide map" : "Show map"}
        </Button>
      </div>

      {showMap ? (
        <div className="relative w-full overflow-hidden rounded-[14px] border border-line-card">
          {isLoaded && location ? (
            <GoogleMap
              mapContainerStyle={MAP_STYLE}
              center={{ lat: location.lat, lng: location.lng }}
              zoom={DEFAULT_ZOOM}
              options={{
                disableDefaultUI: true,
                zoomControl: true,
                clickableIcons: false,
                styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }],
              }}
              onLoad={onMapLoad}
            >
              <MarkerF position={{ lat: location.lat, lng: location.lng }} />
              {/* Branch radius circles (map overlay colours are not CSS, so they stay literal) */}
              {user?.assignedBranches?.map((branch) => (
                <CircleF
                  key={branch._id}
                  center={{ lat: branch.lat, lng: branch.lng }}
                  radius={branch.radius}
                  options={{ fillColor: GEOFENCE_COLOR, fillOpacity: 0.1, strokeColor: GEOFENCE_COLOR, strokeOpacity: 0.5, strokeWeight: 2 }}
                />
              ))}
            </GoogleMap>
          ) : (
            <div className="flex h-[350px] items-center justify-center bg-surface-muted text-small text-ink-3">{loadingLocation ? "Fetching location…" : "Unable to load map"}</div>
          )}
        </div>
      ) : null}

      <p className="text-center text-small text-ink-3">Selfie not working? You can use today&apos;s code on the next screen.</p>
    </MobilePage>
  );
};

export default PunchInScreen;
