---
id: equipo-ciclo-vida
title: Equipo — crear, unirse y administrar
category: equipo
tags: [equipo, invite, owner, salir, expulsar, transferir, codigo]
summary: Ciclo de vida del equipo: crear, invitar, salir, ownership y eliminar.
---

Página **Equipo** (`/team`).

## Crear o unirse

- **Crear**: eliges nombre; eres **owner**; recibes un código de 8 caracteres.
- **Unirse**: introduce el código o abre `/team?code=XXXX`.
- Solo un equipo por persona. Si ya estás en uno, sal antes de unirte a otro.

## Owner puede

| Acción | Efecto |
|--------|--------|
| Regenerar código | Invalida el invite anterior |
| Copiar enlace | Comparte `/team?code=…` |
| Hacer owner | Transfiere la propiedad a otro miembro |
| Expulsar | Saca a un miembro (no al owner) |
| Eliminar equipo | Borra equipo, slots e invites (CASCADE) |

## Salir del equipo

- Los **miembros** pueden salir en cualquier momento.
- El **owner** con más miembros debe **transferir ownership** antes de salir.
- Si eres el único miembro y sales, se elimina el equipo vacío.
