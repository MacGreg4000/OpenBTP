// Notes et to-do list personnelles du dashboard (UserNotes)
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma/client'
import { ToolDefinition } from '../types'

interface TodoItem {
  id: string
  text: string
  completed: boolean
  important: boolean
}

function parseTodos(raw: string | null): TodoItem[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>(\n)?/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
}

export const lireNotesDashboard: ToolDefinition = {
  name: 'lire_notes_dashboard',
  description:
    "Lit le bloc-notes personnel et la to-do list de l'utilisateur sur son dashboard.",
  parameters: { type: 'object', properties: {} },
  execute: async (_args, ctx) => {
    const notes = await prisma.userNotes.findUnique({
      where: { userId: ctx.userId },
      select: { content: true, todos: true, updatedAt: true },
    })
    if (!notes) return { notes: '', todos: [], info: 'Bloc-notes vide.' }
    return {
      notes: stripHtml(notes.content || ''),
      todos: parseTodos(notes.todos).map((t) => ({
        texte: t.text,
        fait: t.completed,
        important: t.important,
      })),
      derniereModification: notes.updatedAt,
    }
  },
}

export const ajouterTodoDashboard: ToolDefinition = {
  name: 'ajouter_todo_dashboard',
  description:
    "Ajoute un élément à la to-do list personnelle du dashboard de l'utilisateur. Nécessite la confirmation de l'utilisateur.",
  requiresConfirmation: true,
  parameters: {
    type: 'object',
    properties: {
      texte: { type: 'string', description: 'Le texte de la tâche à ajouter' },
      important: { type: 'boolean', description: 'Marquer comme important (défaut false)' },
    },
    required: ['texte'],
  },
  summarize: (args) =>
    `Ajouter à votre to-do list du dashboard : « ${String(args.texte)} »${args.important ? ' (important)' : ''}`,
  execute: async (args, ctx) => {
    const texte = String(args.texte || '').trim()
    if (!texte) return { erreur: 'Texte de la tâche vide.' }

    const existing = await prisma.userNotes.findUnique({
      where: { userId: ctx.userId },
      select: { todos: true },
    })
    const todos = parseTodos(existing?.todos ?? null)
    todos.push({ id: randomUUID(), text: texte, completed: false, important: args.important === true })

    await prisma.userNotes.upsert({
      where: { userId: ctx.userId },
      update: { todos: JSON.stringify(todos) },
      create: { userId: ctx.userId, content: '', todos: JSON.stringify(todos) },
    })
    return { succes: true, nombreTodos: todos.length }
  },
}

export const ajouterNoteDashboard: ToolDefinition = {
  name: 'ajouter_note_dashboard',
  description:
    "Ajoute une ligne au bloc-notes personnel du dashboard de l'utilisateur (sans effacer l'existant). Nécessite la confirmation de l'utilisateur.",
  requiresConfirmation: true,
  parameters: {
    type: 'object',
    properties: {
      texte: { type: 'string', description: 'Le texte à ajouter au bloc-notes' },
    },
    required: ['texte'],
  },
  summarize: (args) => `Ajouter à votre bloc-notes du dashboard : « ${String(args.texte)} »`,
  execute: async (args, ctx) => {
    const texte = String(args.texte || '').trim()
    if (!texte) return { erreur: 'Texte vide.' }

    const existing = await prisma.userNotes.findUnique({
      where: { userId: ctx.userId },
      select: { content: true },
    })
    const current = existing?.content || ''
    const escaped = texte.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    // Le bloc-notes stocke du HTML (éditeur riche) — on ajoute proprement à la suite
    const content = current ? `${current}<br>• ${escaped}` : `• ${escaped}`

    await prisma.userNotes.upsert({
      where: { userId: ctx.userId },
      update: { content },
      create: { userId: ctx.userId, content },
    })
    return { succes: true }
  },
}
