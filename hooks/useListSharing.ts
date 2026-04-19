import { useCallback, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import {
  getMyPermission,
  getMemberCount,
  resolveCloudListId,
} from '../services/listSharingService';

export type ListPermission = 'owner' | 'edit' | 'view' | null;

export function useListSharing(listId: string, user: User | null) {
  const [cloudListId, setCloudListId] = useState<string | null>(null);
  const [myPermission, setMyPermission] = useState<ListPermission>(null);
  const [memberCount, setMemberCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) return;
    const [cid, perm, count] = await Promise.all([
      resolveCloudListId(listId),
      getMyPermission(listId),
      getMemberCount(listId),
    ]);
    setCloudListId(cid);
    setMyPermission(perm);
    setMemberCount(count);
  }, [listId, user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      const [cid, perm, count] = await Promise.all([
        resolveCloudListId(listId),
        getMyPermission(listId),
        getMemberCount(listId),
      ]);
      if (cancelled) return;
      setCloudListId(cid);
      setMyPermission(perm);
      setMemberCount(count);
    })();

    return () => {
      cancelled = true;
    };
  }, [listId, user]);

  return {
    cloudListId,
    myPermission,
    memberCount,
    isViewOnly: myPermission === 'view',
    refresh,
  };
}
