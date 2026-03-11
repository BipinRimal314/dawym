import { WHISPER_MODELS } from '../types'

interface ModelSelectorProps {
  selectedModelId: string
  onChange: (modelId: string) => void
  disabled?: boolean
}

export default function ModelSelector({ selectedModelId, onChange, disabled }: ModelSelectorProps) {
  return (
    <div className="rounded-lg p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <h3 className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
        Whisper Model
      </h3>
      <div className="flex flex-col gap-2" role="radiogroup" aria-label="Whisper model selection">
        {WHISPER_MODELS.map(model => {
          const isSelected = model.id === selectedModelId
          return (
            <button
              key={model.id}
              onClick={() => onChange(model.id)}
              disabled={disabled}
              role="radio"
              aria-checked={isSelected}
              aria-label={`${model.name} model, ${model.size}, ${model.accuracy}`}
              className="flex items-center justify-between px-3 py-2.5 rounded-lg text-left cursor-pointer transition-all"
              style={{
                background: isSelected ? 'var(--color-accent)' : 'var(--color-surface-2)',
                color: isSelected ? '#fff' : 'var(--color-text)',
                opacity: disabled ? 0.5 : 1,
              }}
            >
              <div>
                <span className="text-sm font-medium">{model.name}</span>
                <span className="text-xs ml-2" style={{ opacity: 0.7 }}>{model.size}</span>
              </div>
              <span className="text-xs" style={{ opacity: 0.7 }}>{model.accuracy}</span>
            </button>
          )
        })}
      </div>
      <p className="text-xs mt-3" style={{ color: 'var(--color-text-muted)' }}>
        Larger models hear more accurately but take longer to download. Models are cached after first use.
      </p>
    </div>
  )
}
