'use client';
import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, LayoutDashboard, Package, Database, FileSpreadsheet, FileText, GitMerge, Calculator, Settings, BookOpen, FolderOpen, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

const ONBOARDING_VERSION = 1;

const STEPS = [
  { icon: Sparkles, title: 'Bem-vindo ao Lastro!', desc: 'O Lastro transforma sua posição de estoque em um dossiê fiscal auditável com rastreabilidade nota a nota. Vamos conhecer o sistema.' },
  { icon: FileText, title: '1. Importe suas NF-e', desc: 'Faça upload dos arquivos XML de notas fiscais. O sistema extrai automaticamente ICMS, ICMS-ST, FCP-ST e todos os dados fiscais.' },
  { icon: FileSpreadsheet, title: '2. Importe a posição de estoque', desc: 'Faça upload de planilhas (CSV, XLSX) ou PDFs com o saldo atual do estoque. O sistema vincula cada item aos produtos do catálogo.' },
  { icon: GitMerge, title: '3. Revise a vinculação', desc: 'O sistema vincula automaticamente cada item do estoque às suas NF-es de origem por SKU, EAN ou códigos alternativos. Você pode revisar e ajustar manualmente.' },
  { icon: Calculator, title: '4. Execute o cálculo de crédito ST', desc: 'Configure regras por UF, NCM, CFOP e execute o cálculo proporcional de crédito ICMS-ST sobre o estoque na data de transição.' },
  { icon: BookOpen, title: '5. Revise o extrato de créditos', desc: 'Extrato completo dos créditos gerados, utilizados, bloqueados e ajustados. Trilha de auditoria por lote de crédito.' },
  { icon: FolderOpen, title: '6. Gere o dossiê', desc: 'Gere documentação fiscal para protocolo de créditos com CSV ou JSON contendo memória de cálculo completa e auditável.' },
  { icon: Database, title: 'Estoque Atual', desc: 'Visualize a posição de estoque por filial e período. Veja SKUs distintos, custos e percentual de vinculação com NF-e.' },
  { icon: Package, title: 'Catálogo', desc: 'Todos os produtos com SKU, EAN, NCM e códigos alternativos. O sistema pode criar produtos automaticamente durante as importações.' },
  { icon: Settings, title: 'Configurações', desc: 'Configure criação automática de catálogo, vinculação automática após importação, cálculo automático e notificações.' },
];

export function Onboarding() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api.get('/users/me/onboarding')
      .then(r => {
        if (!r.data?.hasSeenOnboarding || (r.data?.onboardingVersion ?? 0) < ONBOARDING_VERSION) {
          setShow(true);
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  const dismiss = () => {
    setShow(false);
    api.put('/users/me/onboarding/dismiss').catch(() => {});
  };

  if (checking || !show) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={dismiss} />
      <div className="relative z-10 bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Progress */}
        <div className="h-1 bg-slate-100">
          <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>

        {/* Close */}
        <button onClick={dismiss} className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors z-10">
          <X className="h-4 w-4" />
        </button>

        {/* Content */}
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Icon className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">{current.title}</h2>
          <p className="text-sm text-slate-600 leading-relaxed">{current.desc}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-8 pb-8">
          <div className="flex items-center gap-1">
            {STEPS.map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === step ? 'bg-blue-500' : i < step ? 'bg-blue-200' : 'bg-slate-200'}`} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setStep(s => s - 1)}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Voltar
              </Button>
            )}
            {step === 0 && (
              <Button variant="ghost" size="sm" onClick={dismiss}>Pular</Button>
            )}
            <Button size="sm" onClick={isLast ? dismiss : () => setStep(s => s + 1)}>
              {isLast ? 'Concluir' : <>Próximo <ChevronRight className="ml-1 h-4 w-4" /></>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
