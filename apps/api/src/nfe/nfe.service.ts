import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { parseNfeXml } from './parser/nfe-xml-parser';
import * as crypto from 'crypto';

@Injectable()
export class NfeService {
  private readonly logger = new Logger(NfeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    @InjectQueue('nfe-import') private readonly queue: Queue,
  ) {}

  async importXmls(branchId: string, files: Express.Multer.File[]) {
    const results = [];
    for (const file of files) {
      try {
        const xmlContent = file.buffer.toString('utf-8');
        if (!xmlContent || xmlContent.trim().length === 0) {
          results.push({ file: file.originalname, status: 'error', message: 'Arquivo XML está vazio' });
          continue;
        }

        let parsed;
        try {
          parsed = parseNfeXml(xmlContent);
        } catch (parseErr) {
          results.push({ file: file.originalname, status: 'error', message: `Erro ao ler XML: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}` });
          continue;
        }

        const h = parsed.header;

        if (!h.chaveAcesso) {
          results.push({ file: file.originalname, status: 'error', message: 'Chave de acesso não encontrada no XML' });
          continue;
        }

        const existing = await this.prisma.nfeDocument.findUnique({ where: { chaveAcesso: h.chaveAcesso } });
        if (existing) {
          results.push({ file: file.originalname, status: 'duplicate', documentId: existing.id });
          continue;
        }

        // Storage upload is optional
        let storageKey: string | undefined;
        try {
          storageKey = this.storage.buildKey('nfe', file.originalname);
          await this.storage.upload(storageKey, file.buffer, 'application/xml');
        } catch (storageErr) {
          this.logger.warn(`Storage upload failed for ${file.originalname}: ${storageErr}`);
          storageKey = undefined;
        }

        const doc = await this.prisma.nfeDocument.create({
          data: {
            branchId,
            chaveAcesso: h.chaveAcesso,
            numero: h.numero,
            serie: h.serie,
            dataEmissao: new Date(h.dataEmissao),
            cnpjEmitente: h.cnpjEmitente,
            nomeEmitente: h.nomeEmitente,
            cnpjDestinatario: h.cnpjDestinatario,
            valorTotal: h.valorTotal,
            emitState: h.emitState || undefined,
            destState: h.destState || undefined,
            operationNature: h.operationNature || undefined,
            rawProtocolNumber: h.rawProtocolNumber || undefined,
            rawAdditionalInfo: h.rawAdditionalInfo || undefined,
            ...(storageKey ? { storageKey } : {}),
            rawXml: xmlContent,
            xmlHash: parsed.xmlHash,
            parserVersion: h.parserVersion,
            importSource: 'web-upload',
            jobStatus: 'QUEUED',
          },
        });

        await this.queue.add('process-nfe-items', { documentId: doc.id });
        results.push({ file: file.originalname, status: 'queued', documentId: doc.id });
      } catch (e) {
        this.logger.error(`Error importing ${file.originalname}:`, e);
        results.push({ file: file.originalname, status: 'error', message: String(e instanceof Error ? e.message : e) });
      }
    }
    return { processed: results.length, results };
  }

  async findAll(branchId?: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const where = branchId ? { branchId } : {};
    const [docs, total] = await Promise.all([
      this.prisma.nfeDocument.findMany({
        where,
        skip,
        take: limit,
        include: { _count: { select: { items: true } } },
        orderBy: { dataEmissao: 'desc' },
      }),
      this.prisma.nfeDocument.count({ where }),
    ]);
    return { docs, total, page, limit };
  }

  async findOne(id: string) {
    return this.prisma.nfeDocument.findUnique({
      where: { id },
      include: { items: { include: { product: true } } },
    });
  }
}
