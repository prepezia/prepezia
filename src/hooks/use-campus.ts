'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { getCampusBySlug, CampusConfig } from '@/lib/campus-mapping';

/**
 * Hook to detect the current campus based on subdomain or query parameter.
 * Priority: 1. Query param (?campus=ug), 2. Subdomain (ug.prepezia.com)
 */
export function useCampus() {
  const searchParams = useSearchParams();

  const campus = useMemo(() => {
    if (typeof window === 'undefined') return null;

    // 1. Check Query Parameter (useful for testing and development)
    const campusParam = searchParams.get('campus');
    if (campusParam) {
      const config = getCampusBySlug(campusParam);
      if (config) return config;
    }

    // 2. Check Hostname Subdomain
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    
    // If hostname is "ug.prepezia.com", parts[0] is "ug"
    // We ignore "www" and the base domain
    if (parts.length >= 3 && parts[0] !== 'www') {
      return getCampusBySlug(parts[0]);
    }

    return null;
  }, [searchParams]);

  return {
    campus,
    isCampusHub: !!campus,
  };
}
