import { Profile, ProfileLink } from "./types";

let profiles: Profile[] = [];
let links: ProfileLink[] = [];

export function getProfiles(): Profile[] {
  return profiles;
}

export function getProfile(id: string): Profile | undefined {
  return profiles.find((p) => p.id === id);
}

export function addProfile(profile: Profile) {
  profiles.push(profile);
}

export function toggleBlock(id: string): Profile | undefined {
  const profile = profiles.find((p) => p.id === id);
  if (profile) {
    profile.blocked = !profile.blocked;
  }
  return profile;
}

export function getLinks(): ProfileLink[] {
  return links;
}

export function addLink(link: ProfileLink) {
  links.push(link);
}

export function getLinkByToken(token: string): ProfileLink | undefined {
  return links.find((l) => l.token === token);
}
