import { kv } from '@/shared/kv/kv'
import { createKvRatingStore } from './kv-rating-store'

export function createRatingStore() {
  return createKvRatingStore(kv)
}
