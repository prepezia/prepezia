/**
 * @fileOverview Maps subdomain slugs to full university names and branding.
 */

export type CampusConfig = {
  slug: string;
  fullName: string;
  shortName: string;
  primaryColor?: string; // HSL format for theme overrides
};

export const campusMapping: Record<string, CampusConfig> = {
  ug: {
    slug: "ug",
    fullName: "University of Ghana (UG)",
    shortName: "UG",
    primaryColor: "221 100% 25%", // UG Blue
  },
  knust: {
    slug: "knust",
    fullName: "Kwame Nkrumah University of Science and Technology (KNUST)",
    shortName: "KNUST",
    primaryColor: "45 100% 50%", // KNUST Gold
  },
  ucc: {
    slug: "ucc",
    fullName: "University of Cape Coast (UCC)",
    shortName: "UCC",
    primaryColor: "0 100% 40%", // UCC Red
  },
  uew: {
    slug: "uew",
    fullName: "University of Education, Winneba (UEW)",
    shortName: "UEW",
  },
  uds: {
    slug: "uds",
    fullName: "University for Development Studies (UDS)",
    shortName: "UDS",
  },
  ashesi: {
    slug: "ashesi",
    fullName: "Ashesi University (AU)",
    shortName: "Ashesi",
    primaryColor: "0 100% 25%", // Ashesi Maroon
  },
  vvu: {
    slug: "vvu",
    fullName: "Valley View University (VVU)",
    shortName: "VVU",
  },
  atu: {
    slug: "atu",
    fullName: "Accra Technical University (ATU)",
    shortName: "ATU",
  },
  gimpa: {
    slug: "gimpa",
    fullName: "Ghana Institute of Management and Public Administration (GIMPA)",
    shortName: "GIMPA",
  },
  gctu: {
    slug: "gctu",
    fullName: "Ghana Communication Technology University (GCTU)",
    shortName: "GCTU",
  }
};

export const getCampusBySlug = (slug: string): CampusConfig | null => {
  return campusMapping[slug.toLowerCase()] || null;
};
