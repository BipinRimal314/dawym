import type { CalibrationPrompt } from '../types'

interface CalibrationPromptCardProps {
  prompt: CalibrationPrompt
  isComplete: boolean
}

export default function CalibrationPromptCard({ prompt, isComplete }: CalibrationPromptCardProps) {
  return (
    <div
      className="rounded-lg p-5"
      style={{
        background: 'var(--color-surface)',
        border: `1px solid ${isComplete ? 'var(--color-success)' : 'var(--color-border)'}`,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold"
          style={{
            background: isComplete ? 'var(--color-success)' : 'var(--color-accent)',
            color: '#fff',
          }}
        >
          {isComplete ? '\u2713' : prompt.id === 'baseline' ? '1' : '2'}
        </span>
        <h3 className="text-sm font-semibold text-[var(--color-text)]">{prompt.label}</h3>
      </div>

      <p className="text-xs mb-4" style={{ color: 'var(--color-accent)' }}>
        {prompt.instruction}
      </p>

      <blockquote
        className="text-sm leading-relaxed pl-4"
        style={{
          color: 'var(--color-text)',
          borderLeft: '3px solid var(--color-accent)',
          opacity: isComplete ? 0.5 : 1,
        }}
      >
        {prompt.text}
      </blockquote>
    </div>
  )
}
