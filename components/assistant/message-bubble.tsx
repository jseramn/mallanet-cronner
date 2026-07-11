export function MessageBubble({
  role,
  content,
}: {
  role: 'user' | 'assistant' | 'system'
  content: string
}) {
  const isUser = role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-muted text-foreground rounded-bl-md border'
        }`}
      >
        {content}
      </div>
    </div>
  )
}
