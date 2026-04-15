import { useCallback, useEffect, useState } from 'react'
import { getBabies } from '../api/babyLogApi'
import { getStoredBabyId, getStoredFamilyId } from '../api/client'

/**
 * Resolves stored babyId/familyId from AsyncStorage and fetches baby metadata.
 * `initialized` becomes true once the IDs are loaded (name/daysOld may arrive later).
 * Call `loadBaby()` in useFocusEffect to detect baby switches.
 */
export function useStoredBaby() {
  const [babyId, setBabyId] = useState<string | null>(null)
  const [familyId, setFamilyId] = useState<string | null>(null)
  const [babyName, setBabyName] = useState<string | undefined>(undefined)
  const [daysOld, setDaysOld] = useState<number | undefined>(undefined)
  const [initialized, setInitialized] = useState(false)

  const loadBaby = useCallback(async () => {
    const [bid, fid] = await Promise.all([getStoredBabyId(), getStoredFamilyId()])
    setBabyId(bid)
    setFamilyId(fid)
    if (bid && fid) {
      getBabies(fid).then(babies => {
        const baby = babies.find(b => b.id === bid)
        setBabyName(baby?.name)
        if (baby?.daysOld != null) setDaysOld(baby.daysOld)
      }).catch(() => {})
    }
    return { babyId: bid, familyId: fid }
  }, [])

  useEffect(() => {
    loadBaby().then(() => setInitialized(true))
  }, [loadBaby])

  return { babyId, familyId, babyName, daysOld, initialized, loadBaby }
}
