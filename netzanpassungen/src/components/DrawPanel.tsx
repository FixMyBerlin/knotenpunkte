import { Button } from '@shared/components/ui/button'
import { Callout } from '@shared/components/ui/callout'
import { Description, ErrorMessage, Field, Label } from '@shared/components/ui/fieldset'
import { Subheading } from '@shared/components/ui/heading'
import { Input } from '@shared/components/ui/input'
import { Text } from '@shared/components/ui/text'
import { Textarea } from '@shared/components/ui/textarea'
import { ignorePasswordManagerProps } from '@shared/form-ignore-password-manager'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import {
  useDrawActions,
  useDrawActive,
  useDrawHover,
  useDrawMessage,
  useDrawPoints,
  useDrawStart,
  useLastNewNodes,
  useVertexIndex,
} from '@/components/draw-store'
import { SuggestionsPanel } from '@/components/SuggestionsPanel'
import { useDeleteSelection } from '@/components/use-delete-selection'
import { useNetwork, useSaveEntries } from '@/components/use-netz'
import { nodeName } from '@/network/element-nr'
import {
  edgesAtNode,
  hostKey,
  virtualNodesOn,
  type NetEdge,
  type NetNode,
  type Network,
} from '@/network/model'
import { suggestVirtualNodeName, takenNodeNames } from '@/network/naming'
import { virtualNodeNamePattern } from '@/network/schema'
import type { SnapTarget } from '@/network/snap'
import { Route } from '@/routes/index'

const kindLabels: Record<NetEdge['kind'], string> = {
  ren: 'REN+-Kante',
  detailnetz: 'Detailnetzkante',
  neu: 'Neue Kante',
}

const nodeKindLabels: Record<NetNode['kind'], string> = {
  amtlich: 'Detailnetzknoten',
  bestand: 'Virtueller Knoten (Bestand)',
  neu: 'Virtueller Knoten (neu)',
}

function metres(value: number) {
  return `${Math.round(value).toLocaleString('de-DE')} m`
}

function targetText(target: SnapTarget, elementNrs: Map<string, string>) {
  if (target.type === 'node') return `${nodeKindLabels[target.node.kind]} ${target.node.name}`
  const elementNr =
    target.edge.kind === 'neu'
      ? elementNrs.get(target.edge.key)
      : (target.edge.elementNr ?? target.edge.ref)
  return `${kindLabels[target.edge.kind]} ${elementNr ?? ''} bei ${metres(target.stationM)} – hier entsteht ein virtueller Knoten`
}

export function DrawPanel() {
  const { gebiet, sel } = Route.useSearch()
  const { network, elementNrs, ready, entriesQuery } = useNetwork(gebiet)
  const save = useSaveEntries(gebiet)
  const active = useDrawActive()
  const start = useDrawStart()
  const points = useDrawPoints()
  const hover = useDrawHover()
  const message = useDrawMessage()
  const lastNewNodes = useLastNewNodes()
  const actions = useDrawActions()

  if (!network) return <Text>Lade Netz …</Text>

  const newNodes = lastNewNodes
    .map((key) => network.nodeByKey(key))
    .filter((node): node is NetNode => node?.kind === 'neu')

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            color={active ? 'amber' : 'sky'}
            onClick={actions.toggle}
            data-testid="draw-toggle"
          >
            {active ? 'Zeichnen beenden' : 'Neue Kante'}
            <kbd className="ml-2 rounded bg-black/20 px-1 text-xs">N</kbd>
          </Button>
          {save.isPending ? <span className="text-xs text-zinc-400">Speichert …</span> : null}
        </div>
        {!ready && entriesQuery.isPending ? <Text>Lade gespeicherte Einträge …</Text> : null}
        {entriesQuery.isError ? (
          <Callout tone="error" title="Laden fehlgeschlagen">
            Gespeicherte Einträge konnten nicht geladen werden; Speichern ist gesperrt.
          </Callout>
        ) : null}
        <Text className="text-xs">
          {!active
            ? 'Ein Klick auf einen Knoten oder eine Kante zeigt sie hier. Neue Kante mit N.'
            : !start
              ? 'Start: einen Knoten oder eine Kante anklicken.'
              : 'Punkte setzen (in der Nähe eines Radfernwegs auf ihm). Ende mit Klick auf einen Knoten oder eine Kante. Alt: Punkt frei setzen · Backspace: Punkt zurück · Esc: Linie abbrechen.'}
        </Text>
        {active && start ? (
          <Text className="text-xs">
            Start: {targetText(start, elementNrs)} · {points.length} Punkte
          </Text>
        ) : null}
        {active && hover ? (
          <Text className="text-xs text-zinc-300" data-testid="hover-target">
            {hover.target
              ? `Klick setzt ${start ? 'das Ende' : 'den Start'}: ${targetText(hover.target, elementNrs)}`
              : hover.free
                ? 'Freier Punkt (Alt)'
                : hover.routePoint
                  ? 'Punkt auf dem Radfernweg'
                  : 'Freier Punkt'}
          </Text>
        ) : null}
        {message ? (
          <Callout tone={message.tone === 'error' ? 'error' : 'info'} title="Hinweis">
            {message.text}
          </Callout>
        ) : null}
      </div>

      {newNodes.length > 0 ? (
        <div className="space-y-3">
          <Subheading>Zuletzt angelegte virtuelle Knoten</Subheading>
          {newNodes.map((node) => (
            <VirtualNodeName key={`${node.key}:${node.name}`} network={network} node={node} />
          ))}
        </div>
      ) : null}

      <SuggestionsPanel />

      {sel ? <Selection network={network} selected={sel} /> : null}
    </div>
  )
}

function Selection({ network, selected }: { network: Network; selected: string }) {
  const node =
    selected.startsWith('k:') || selected.startsWith('v:') ? network.nodeByKey(selected) : undefined
  const edge = node ? undefined : network.edgeByKey(selected)
  if (node) return <NodeDetails network={network} node={node} />
  if (edge) return <EdgeDetails network={network} edge={edge} />
  return <Text>Die Auswahl „{selected}“ gibt es nicht (mehr).</Text>
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <dt className="shrink-0 text-zinc-400">{label}</dt>
      <dd className="min-w-0 text-right break-words text-zinc-100">{children}</dd>
    </div>
  )
}

function NodeDetails({ network, node }: { network: Network; node: NetNode }) {
  const navigate = useNavigate({ from: Route.fullPath })
  const deleteSelection = useDeleteSelection()
  const attached = edgesAtNode(network, node.key)
  const { elementNrs } = useNetwork(Route.useSearch().gebiet)
  return (
    <div className="space-y-3" data-testid="node-details">
      <Subheading>{nodeKindLabels[node.kind]}</Subheading>
      <dl className="space-y-1">
        <Row label="Name / ID">{node.name}</Row>
        <Row label="Lage">
          {node.lngLat[1].toFixed(6)}, {node.lngLat[0].toFixed(6)}
        </Row>
        <Row label="Neue Kanten">
          {attached.length === 0
            ? '–'
            : attached.map((edge) => (
                <button
                  key={edge.key}
                  type="button"
                  className="block w-full text-right text-sky-400 hover:underline"
                  onClick={() =>
                    void navigate({
                      search: (previous) => ({ ...previous, sel: edge.key }),
                      replace: true,
                    })
                  }
                >
                  {elementNrs.get(edge.key)}
                </button>
              ))}
        </Row>
      </dl>
      {node.kind === 'neu' ? (
        <>
          <VirtualNodeName key={`${node.key}:${node.name}`} network={network} node={node} />
          <CommentField
            key={`${node.key}:kommentar`}
            stored={node.stored!}
            value={node.stored!.data.kommentar ?? ''}
          />
          <Text className="text-xs">Zum Verschieben den Knoten entlang seiner Kante ziehen.</Text>
          <Button type="button" plain onClick={deleteSelection}>
            Knoten löschen (Entf)
          </Button>
        </>
      ) : null}
    </div>
  )
}

/** Name of a virtual node drawn here, with the suggestion and what it is based on. */
function VirtualNodeName({ network, node }: { network: Network; node: NetNode }) {
  const { gebiet } = Route.useSearch()
  const save = useSaveEntries(gebiet)
  const { elementNrs } = useNetwork(gebiet)
  const stored = node.stored!
  const [name, setName] = useState(node.name)
  const [error, setError] = useState<string | null>(null)
  const host = network.edgeByKey(hostKey(stored.data.traeger))
  const suggestion = host
    ? suggestVirtualNodeName({
        network,
        host,
        stationM: stored.data.traeger.station_m,
        excludeNode: node.key,
        hostElementNr: elementNrs.get(host.key) ?? null,
      })
    : null

  function submit(next: string) {
    const trimmed = next.trim()
    if (!virtualNodeNamePattern.test(trimmed)) {
      setError('Beginnt mit V, danach nur Buchstaben, Ziffern und Bindestriche.')
      return
    }
    if (trimmed !== node.name && takenNodeNames(network, node.key).has(trimmed)) {
      setError(`„${trimmed}“ ist schon vergeben.`)
      return
    }
    setError(null)
    if (trimmed === node.name) return
    save.mutate([{ id: stored.id, data: { ...stored.data, name: trimmed } }])
  }

  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault()
        submit(name)
      }}
    >
      <Field>
        <Label>Name</Label>
        <Input
          value={name}
          invalid={Boolean(error)}
          data-testid="virtual-node-name"
          onChange={(event) => setName(event.currentTarget.value)}
          onFocus={(event) => event.currentTarget.select()}
          {...ignorePasswordManagerProps}
        />
        {error ? <ErrorMessage>{error}</ErrorMessage> : null}
        {suggestion ? (
          <Description>
            Vorschlag <strong className="text-zinc-200">{suggestion.name}</strong>:{' '}
            {suggestion.reason}
          </Description>
        ) : (
          <Description>Die Trägerkante fehlt; kein Vorschlag.</Description>
        )}
      </Field>
      <div className="flex gap-2">
        <Button type="submit" color="sky" disabled={name.trim() === node.name}>
          Übernehmen
        </Button>
        {suggestion && suggestion.name !== name ? (
          <Button
            type="button"
            outline
            onClick={() => {
              setName(suggestion.name)
              submit(suggestion.name)
            }}
          >
            Vorschlag einsetzen
          </Button>
        ) : null}
      </div>
    </form>
  )
}

function CommentField({
  stored,
  value,
}: {
  stored: NonNullable<NetNode['stored']> | NonNullable<NetEdge['stored']>
  value: string
}) {
  const { gebiet } = Route.useSearch()
  const save = useSaveEntries(gebiet)
  const [text, setText] = useState(value)
  return (
    <Field>
      <Label>Kommentar</Label>
      <Textarea
        rows={2}
        value={text}
        onChange={(event) => setText(event.currentTarget.value)}
        onBlur={() => {
          if (text === value) return
          save.mutate([{ id: stored.id, data: { ...stored.data, kommentar: text || undefined } }])
        }}
      />
    </Field>
  )
}

function TextField({
  label,
  value,
  list,
  onSave,
}: {
  label: string
  value: string
  list?: string
  onSave: (value: string) => void
}) {
  const [text, setText] = useState(value)
  return (
    <Field>
      <Label>{label}</Label>
      <Input
        value={text}
        list={list}
        onChange={(event) => setText(event.currentTarget.value)}
        onBlur={() => {
          if (text !== value) onSave(text.trim())
        }}
        {...ignorePasswordManagerProps}
      />
    </Field>
  )
}

function EdgeDetails({ network, edge }: { network: Network; edge: NetEdge }) {
  const navigate = useNavigate({ from: Route.fullPath })
  const { gebiet } = Route.useSearch()
  const save = useSaveEntries(gebiet)
  const { elementNrs } = useNetwork(gebiet)
  const deleteSelection = useDeleteSelection()
  const vertexIndex = useVertexIndex()
  const onEdge = virtualNodesOn(network, edge.key)
  const stored = edge.stored
  const elementNr = edge.kind === 'neu' ? elementNrs.get(edge.key) : edge.elementNr

  function selectNode(key: string | null) {
    if (!key) return
    void navigate({ search: (previous) => ({ ...previous, sel: key }), replace: true })
  }

  return (
    <div className="space-y-3" data-testid="edge-details">
      <Subheading>{kindLabels[edge.kind]}</Subheading>
      <dl className="space-y-1">
        <Row label="Elementnummer">{elementNr ?? '–'}</Row>
        <Row label="von">
          <button
            type="button"
            className="text-sky-400 hover:underline"
            onClick={() => selectNode(edge.from)}
          >
            {nodeName(network, edge.from)}
          </button>
        </Row>
        <Row label="bis">
          <button
            type="button"
            className="text-sky-400 hover:underline"
            onClick={() => selectNode(edge.to)}
          >
            {nodeName(network, edge.to)}
          </button>
        </Row>
        <Row label="Länge">{metres(edge.lengthM)}</Row>
        {edge.kind !== 'neu' ? <Row label="Straße">{edge.strassenname ?? '–'}</Row> : null}
        {edge.kind === 'ren' ? (
          <Row label="Radverkehrsnetz">{edge.radverkehrsnetz ?? '–'}</Row>
        ) : null}
        {edge.kind === 'detailnetz' ? <Row label="Verkehrsebene">{edge.verkehrsebene}</Row> : null}
        <Row label="Virtuelle Knoten darauf">
          {onEdge.length === 0
            ? '–'
            : onEdge.map((node) => (
                <button
                  key={node.key}
                  type="button"
                  className="block w-full text-right text-sky-400 hover:underline"
                  onClick={() => selectNode(node.key)}
                >
                  {node.name} ({metres(node.stored!.data.traeger.station_m)})
                </button>
              ))}
        </Row>
        {stored ? (
          <Row label="Angelegt">
            {stored.created_by}, {stored.created_at.slice(0, 10)}
          </Row>
        ) : null}
      </dl>
      {stored ? (
        <>
          <TextField
            key={`${edge.key}:strasse`}
            label="Straßenname"
            value={stored.data.strassenname ?? ''}
            onSave={(value) =>
              save.mutate([
                { id: stored.id, data: { ...stored.data, strassenname: value || undefined } },
              ])
            }
          />
          <TextField
            key={`${edge.key}:route`}
            label="Radfernweg"
            list="na-route-names"
            value={stored.data.routen_fernradweg ?? ''}
            onSave={(value) =>
              save.mutate([
                { id: stored.id, data: { ...stored.data, routen_fernradweg: value || undefined } },
              ])
            }
          />
          <datalist id="na-route-names">
            {[...new Set(network.base.routes.map((route) => route.name))].map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <CommentField
            key={`${edge.key}:kommentar`}
            stored={stored}
            value={stored.data.kommentar ?? ''}
          />
          <Text className="text-xs">
            Punkte ziehen zum Verschieben, die kleinen Punkte dazwischen ziehen für einen neuen
            Punkt. Einen Punkt anklicken und Entf drücken, um ihn zu löschen
            {vertexIndex !== null ? ` (gewählt: Punkt ${vertexIndex})` : ''}.
          </Text>
          <Button type="button" plain onClick={deleteSelection}>
            Kante löschen (Entf)
          </Button>
        </>
      ) : null}
    </div>
  )
}
