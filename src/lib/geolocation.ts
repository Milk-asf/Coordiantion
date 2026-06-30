const LOCATION_UNAVAILABLE = "Location unavailable"

export interface ClockLocation {
  latitude: number | null
  longitude: number | null
  locationLabel: string
}

function formatCoordinates(latitude: number, longitude: number): string {
  const latDir = latitude >= 0 ? "N" : "S"
  const lngDir = longitude >= 0 ? "E" : "W"
  return `${Math.abs(latitude).toFixed(5)}°${latDir}, ${Math.abs(longitude).toFixed(5)}°${lngDir}`
}

export function captureClockLocation(): Promise<ClockLocation> {
  if (typeof window === "undefined" || !("geolocation" in navigator)) {
    return Promise.resolve({ latitude: null, longitude: null, locationLabel: LOCATION_UNAVAILABLE })
  }

  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => {
      resolve({ latitude: null, longitude: null, locationLabel: LOCATION_UNAVAILABLE })
    }, 8000)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeout)
        const { latitude, longitude } = position.coords
        resolve({
          latitude,
          longitude,
          locationLabel: formatCoordinates(latitude, longitude),
        })
      },
      () => {
        clearTimeout(timeout)
        resolve({ latitude: null, longitude: null, locationLabel: LOCATION_UNAVAILABLE })
      },
      { enableHighAccuracy: true, timeout: 7000, maximumAge: 0 },
    )
  })
}

export function mapsUrlForCoordinates(latitude: number, longitude: number): string {
  return `https://www.google.com/maps?q=${latitude},${longitude}`
}
