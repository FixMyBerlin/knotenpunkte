import { z } from 'zod'

export const datasetNamePattern = /^[a-z0-9]+(-[a-z0-9]+)*$/

export function isValidDatasetName(value: string) {
  return value.length >= 3 && value.length <= 60 && datasetNamePattern.test(value)
}

export function slugifyDatasetName(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replaceAll('ä', 'ae')
    .replaceAll('ö', 'oe')
    .replaceAll('ü', 'ue')
    .replaceAll('ß', 'ss')
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '')
  return slug || 'dataset'
}

export const datasetNameSchema = z
  .string()
  .min(3)
  .max(60)
  .regex(datasetNamePattern, '3–60 Zeichen, nur Kleinbuchstaben, Ziffern und Bindestriche')
