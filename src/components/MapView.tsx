import { divIcon } from 'leaflet'
import { useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import type { RadarData } from '../api/rainviewer'
import { radarTileUrl } from '../api/rainviewer'
import type { LatLng, SelectedPoint } from '../types'

const DEFAULT_CENTER: [number, number] = [42.8, 12.5]
const DEFAULT_ZOOM = 6

const pinIcon = divIcon({
  className: '',
  html: '<div class="wee-pin"></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 26],
})

function ClickCatcher({ onPick }: { onPick: (p: LatLng) => void }) {
  useMapEvents({
    click: (e) => onPick({ lat: e.latlng.lat, lon: e.latlng.lng }),
  })
  return null
}

function FlyTo({ target }: { target: SelectedPoint | null }) {
  const map = useMap()
  useEffect(() => {
    if (!target) return
    map.flyTo([target.lat, target.lon], Math.max(map.getZoom(), 11), { duration: 0.8 })
  }, [map, target])
  return null
}

/** The radar lives in a custom pane above the base tiles but below markers and popups. */
function RadarOverlay({ radar, frameIndex }: { radar: RadarData; frameIndex: number }) {
  const map = useMap()
  const [paneReady, setPaneReady] = useState(false)

  useEffect(() => {
    if (!map.getPane('radar')) {
      const pane = map.createPane('radar')
      pane.style.zIndex = '350'
      pane.style.pointerEvents = 'none'
    }
    setPaneReady(true)
  }, [map])

  const frame = radar.frames[frameIndex]
  if (!paneReady || !frame) return null
  return (
    <TileLayer
      key={frame.path}
      url={radarTileUrl(radar.host, frame)}
      opacity={0.65}
      pane="radar"
      // RainViewer serves native 256px tiles up to zoom 7 only: beyond that Leaflet upscales them
      maxNativeZoom={7}
      maxZoom={19}
      attribution='<a href="https://www.rainviewer.com/">RainViewer</a>'
    />
  )
}

export interface MapViewProps {
  selected: SelectedPoint | null
  onPick: (p: LatLng) => void
  radar: RadarData | null
  radarFrameIndex: number
  radarVisible: boolean
}

export default function MapView({ selected, onPick, radar, radarFrameIndex, radarVisible }: MapViewProps) {
  const position = useMemo<[number, number] | null>(
    () => (selected ? [selected.lat, selected.lon] : null),
    [selected],
  )

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      zoomControl={false}
      className="h-full w-full"
      attributionControl={true}
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      {radarVisible && radar && <RadarOverlay radar={radar} frameIndex={radarFrameIndex} />}
      <ClickCatcher onPick={onPick} />
      <FlyTo target={selected} />
      {position && <Marker position={position} icon={pinIcon} />}
    </MapContainer>
  )
}
