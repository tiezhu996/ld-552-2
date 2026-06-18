import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { publicUserSelect } from '../../prisma/selects';
import { InterviewResult, ResumeStatus, UserRole } from '../../constants/enums';
@Injectable()
export class InterviewsService {
  constructor(private prisma: PrismaService) {}
  findAll(q: any, req: any) {
    const where: any = { interviewerId: req.dataScope?.interviewerId, scheduledAt: {} };
    if (q.startDate) where.scheduledAt.gte = new Date(q.startDate);
    if (q.endDate) where.scheduledAt.lte = new Date(q.endDate);
    if (q.interviewerId && req.user.role !== UserRole.INTERVIEWER) where.interviewerId = Number(q.interviewerId);
    if (!Object.keys(where.scheduledAt).length) delete where.scheduledAt;
    return this.prisma.interview.findMany({ where, include: { resume: { include: { candidate: true, job: true } }, interviewer: { select: publicUserSelect } }, orderBy: { scheduledAt: 'asc' } });
  }
  async create(data: any) {
    const interview = await this.prisma.interview.create({ data: { ...data, scheduledAt: new Date(data.scheduledAt), result: InterviewResult.PENDING }, include: { resume: true } });
    await this.prisma.resume.update({ where: { id: data.resumeId }, data: { status: ResumeStatus.INTERVIEWING } });
    return interview;
  }
  private calculateAverageScore(data: any): number | undefined {
    const scores: number[] = [];
    if (data.professionalScore !== undefined && data.professionalScore !== null) scores.push(Number(data.professionalScore));
    if (data.communicationScore !== undefined && data.communicationScore !== null) scores.push(Number(data.communicationScore));
    if (data.cultureScore !== undefined && data.cultureScore !== null) scores.push(Number(data.cultureScore));
    if (scores.length === 0) return data.score !== undefined ? Number(data.score) : undefined;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }
  async update(id: number, data: any) {
    const current = await this.prisma.interview.findUnique({ where: { id }, include: { resume: true } });
    if (!current) throw new NotFoundException('Interview not found');
    const averageScore = this.calculateAverageScore(data);
    const updateData: any = { ...data, scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined };
    if (averageScore !== undefined) updateData.score = averageScore;
    const updated = await this.prisma.interview.update({ where: { id }, data: updateData, include: { resume: true, interviewer: { select: publicUserSelect } } });
    return { ...updated, beforeStatus: current.result, candidateId: current.resume.candidateId };
  }
}
