---
id: faq
title: Preguntas frecuentes
category: faq
tags: [faq, ayuda, error, password, seed, limites]
summary: Dudas comunes: contraseña, un equipo, seed, IA y errores.
---

## ¿Puedo recuperar la contraseña por email?

Aún **no**. No hay reset por correo. Usa un gestor de contraseñas o pide ayuda a quien administre la instancia.

## ¿Puedo estar en varios equipos?

**No.** Un usuario = un equipo. Sal del actual para unirte a otro.

## ¿Qué es el modo demo / seed?

Solo en desarrollo local (`pnpm dev:seed`). Muestra cuentas `*@demo.mallanet.org` con contraseña `demo1234`. **Nunca** en producción.

## El timeline está vacío

1. ¿Tienes perfil? (`/profile`)
2. ¿Estás en un equipo? (`/team`)
3. ¿Alguien pintó horario semanal o bloques?

## La IA no funciona

Falta `MISTRAL_API_KEY` / `OPENROUTER_API_KEY` o se alcanzó el rate limit. El resto de la app sigue funcionando.

## ¿Hay OAuth (Google/GitHub)?

No en esta versión. Solo email y contraseña.
