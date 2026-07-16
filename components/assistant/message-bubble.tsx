'use client'

import Link from 'next/link'
import ReactMarkdown from 'react-markdown'

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
        className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-md whitespace-pre-wrap'
            : 'bg-muted text-foreground rounded-bl-md border'
        }`}
      >
        {isUser ? (
          content
        ) : (
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0 text-pretty">{children}</p>,
              ul: ({ children }) => (
                <ul className="mb-2 last:mb-0 list-disc space-y-1 pl-4">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="mb-2 last:mb-0 list-decimal space-y-1 pl-4">{children}</ol>
              ),
              li: ({ children }) => <li className="text-pretty">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              em: ({ children }) => <em>{children}</em>,
              code: ({ children }) => (
                <code className="rounded bg-background/60 px-1 py-0.5 font-mono text-[0.85em]">
                  {children}
                </code>
              ),
              a: ({ href, children }) => {
                const url = href ?? '#'
                if (url.startsWith('/')) {
                  return (
                    <Link href={url} className="font-medium text-primary underline underline-offset-2">
                      {children}
                    </Link>
                  )
                }
                return (
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-primary underline underline-offset-2"
                  >
                    {children}
                  </a>
                )
              },
            }}
          >
            {content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  )
}
