// ============================================================
// BEAMLAB — Local Storage Project Manager
// ============================================================

import { Project, BeamModel, AnalysisResult } from '../types/beam';
import { generateId } from './helpers';

const STORAGE_KEY = 'beamlab-projects';
const CURRENT_KEY = 'beamlab-current-project';

export function saveProject(project: Project): void {
  const projects = getAllProjects();
  const existing = projects.findIndex(p => p.id === project.id);
  project.updatedAt = new Date().toISOString();
  
  if (existing >= 0) {
    projects[existing] = project;
  } else {
    projects.push(project);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function getAllProjects(): Project[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function getProject(id: string): Project | undefined {
  return getAllProjects().find(p => p.id === id);
}

export function deleteProject(id: string): void {
  const projects = getAllProjects().filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function duplicateProject(id: string): Project | undefined {
  const original = getProject(id);
  if (!original) return undefined;
  
  const duplicate: Project = {
    ...JSON.parse(JSON.stringify(original)),
    id: generateId('proj'),
    name: `${original.name} (Copy)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  saveProject(duplicate);
  return duplicate;
}

export function createProject(name: string, beamModel: BeamModel): Project {
  const project: Project = {
    id: generateId('proj'),
    name,
    beamModel,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveProject(project);
  return project;
}

export function exportProjectJSON(project: Project): string {
  return JSON.stringify(project, null, 2);
}

export function importProjectJSON(json: string): Project | null {
  try {
    const project = JSON.parse(json) as Project;
    project.id = generateId('proj');
    project.createdAt = new Date().toISOString();
    project.updatedAt = new Date().toISOString();
    saveProject(project);
    return project;
  } catch {
    return null;
  }
}

export function setCurrentProjectId(id: string): void {
  localStorage.setItem(CURRENT_KEY, id);
}

export function getCurrentProjectId(): string | null {
  return localStorage.getItem(CURRENT_KEY);
}
