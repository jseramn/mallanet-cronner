---
id: slots-ia
title: Sugerencias de slots con IA
category: slots
tags: [ia, mistral, openrouter, sugerir, slots]
summary: Botón Sugerir con IA analiza disponibilidad y propone ventanas.
---

En **Slots**, el botón **Sugerir con IA** analiza la disponibilidad declarada del equipo (próximos 7 días) y propone franjas.

## Requisitos

- Al menos **2 miembros** en el equipo.
- Variable de entorno `MISTRAL_API_KEY` u `OPENROUTER_API_KEY` configurada en el servidor.
- Límite: **3 sugerencias por hora** por usuario.

## Resultado

- Si la IA devuelve JSON estructurado, puedes **crear el slot con un clic**.
- Si no, verás texto libre con las propuestas.

La IA se basa en horarios y bloques que el equipo haya declarado; si nadie tiene horario, las sugerencias serán pobres.
