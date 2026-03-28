import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { XMLParser } from 'fast-xml-parser';

@Injectable()
export class NfeService {
  private readonly logger = new Logger(NfeService.name);
  private readonly xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    @InjectQueue('nfe-import') private readonly queue: Queue,
  ) {}

  async importXmls(branchId: string, files: Express.Multer.File[]) {
    const results = [];
    for (const file of files) {
      try {
        const parsed = this.xmlParser.parse(file.buffer.toString('utf-8'));
        const nfeProc = parsed.nfeProc ?? parsed;
        const nfe = nfeProc.NFe?.infNFe ?? nfeProc.infNFe;
        if (!nfe) {
          results.push({ file: file.originalname, status: 'error', message: 'Invalid NF-e XML structure' });
          continue;
        }

        const ide = nfe.ide;
        const emit = nfe.emit;
        const dest = nfe.dest;
        const total = nfe.total?.ICMSTot;
        const chave = nfe['@_Id']?.replace('NFe', '') ?? '';

        const existing = await this.prisma.nfeDocument.findUnique({ where: { chaveAcesso: chave } });
        if (existing) {
          results.push({ file: file.originalname, status: 'duplicate', documentId: existing.id });
          continue;
        }

        // Storage upload is optional - rawXml is stored in DB as primary source
        let storageKey: string | undefined;
        try {
          storageKey = this.storage.buildKey('nfe', file.originalname);
          await this.storage.upload(storageKey, file.buffer, 'application/xml');
        } catch (storageErr) {
          this.logger.warn(`Storage upload failed for ${file.originalname} — continuing without storage: ${storageErr}`);
          storageKey = undefined;
        }

        const doc = await this.prisma.nfeDocument.create({
          data: {
            branchId,
            chaveAcesso: chave,
            numero: String(ide.nNF ?? ide.nNf ?? 0),
            serie: String(ide.serie ?? 1),
            dataEmissao: new Date(ide.dhEmi ?? ide.dEmi ?? new Date()),
            cnpjEmitente: String(emit.CNPJ ?? emit.CPF ?? ''),
            nomeEmitente: String(emit.xNome ?? emit.xFant ?? ''),
            cnpjDestinatario: String(dest?.CNPJ ?? dest?.CPF ?? ''),
            valorTotal: parseFloat(String(total?.vNF ?? 0)),
            ...(storageKey ? { storageKey } : {}),
            rawXml: file.buffer.toString('utf-8'),
            jobStatus: 'QUEUED',
          },
        });

        await this.queue.add('process-nfe-items', { documentId: doc.id });
        results.push({ file: file.originalname, status: 'queued', documentId: doc.id });
      } catch (e) {
        this.logger.error(`Error parsing ${file.originalname}:`, e);
        results.push({ file: file.originalname, status: 'error', message: String(e) });
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
