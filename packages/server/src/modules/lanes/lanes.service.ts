import prisma from '../../config/db.js';
import { ApiError } from '../../utils/api-error.js';

export class LanesService {
  async list(projectId: string) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw ApiError.notFound('Project not found');

    return prisma.lane.findMany({
      where: { projectId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async create(projectId: string, data: { name: string; color?: string }) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw ApiError.notFound('Project not found');

    const existing = await prisma.lane.findFirst({ where: { projectId, name: data.name } });
    if (existing) throw ApiError.conflict(`Lane "${data.name}" already exists`);

    const last = await prisma.lane.findFirst({
      where: { projectId },
      orderBy: { sortOrder: 'desc' },
    });
    const sortOrder = (last?.sortOrder ?? -1) + 1;

    return prisma.lane.create({
      data: { projectId, name: data.name, color: data.color ?? '#94a3b8', sortOrder },
    });
  }

  async update(
    projectId: string,
    laneId: string,
    data: { name?: string; color?: string; sortOrder?: number },
  ) {
    const lane = await prisma.lane.findFirst({ where: { id: laneId, projectId } });
    if (!lane) throw ApiError.notFound('Lane not found');

    return prisma.lane.update({ where: { id: laneId }, data });
  }

  async delete(projectId: string, laneId: string) {
    const lane = await prisma.lane.findFirst({ where: { id: laneId, projectId } });
    if (!lane) throw ApiError.notFound('Lane not found');

    await prisma.task.updateMany({
      where: { projectId, laneId },
      data: { laneId: null },
    });

    await prisma.lane.delete({ where: { id: laneId } });
  }
}

export const lanesService = new LanesService();
