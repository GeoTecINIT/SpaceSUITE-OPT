/// <reference lib="webworker" />

import jsPDF from 'jspdf';
import { PdfWorkerPayload } from '../models/pdfWorkerPayload';
import { Competence, OccupationalProfile } from '../models/occupationalProfile';

addEventListener('message', ({data}: {data: PdfWorkerPayload}) => {
  const { profile, assets, scaleFactor } = data;
  const doc = new jsPDF();

  if (!assets.watermark) assets.watermark = '';

  addWatermark(doc, assets.watermark);
  let y = 25;

  if (assets.poppinsRegular) {
    doc.addFileToVFS('Poppins-Regular.ttf', assets.poppinsRegular);
    doc.addFont('Poppins-Regular.ttf', 'Poppins', 'normal');
  }
  if (assets.poppinsBold) {
    doc.addFileToVFS('Poppins-Bold.ttf', assets.poppinsBold);
    doc.addFont('Poppins-Bold.ttf', 'Poppins', 'bold');
  } 
  if (assets.poppinsItalic) {
    doc.addFileToVFS('Poppins-Italic.ttf', assets.poppinsItalic);
    doc.addFont('Poppins-Italic.ttf', 'Poppins', 'italic');
  }

  doc.setLineHeightFactor(scaleFactor);

  applyMetadata(doc, profile);
  y = renderHeader(doc, profile, y, assets);
  y = renderSummary(doc, profile, y, assets);
  y = renderDomains(doc, profile, y, assets);
  y = renderKnowledge(doc, profile, y, assets);
  y = renderSkills(doc, profile, y, assets);
  y = renderTransversalSkills(doc, profile, y, assets);
  renderFooter(doc, assets);

  const blob = doc.output('blob');

  postMessage({
    blob,
    filename: buildFilename(profile)
  });
});

/* ============================
    METADATA
============================ */

function applyMetadata(doc: jsPDF, profile: OccupationalProfile) {
  doc.setProperties({
    title: `${profile.title} – Profile`,
    subject: 'Occupational Profile',
    author: 'SpaceSuite',
    creator: 'SpaceSuite'
  });
}

/* ============================
    HEADER
============================ */

function renderHeader(doc: jsPDF, p: OccupationalProfile, y: number,  assets: {
    poppinsRegular?: string | undefined;
    poppinsBold?: string | undefined;
    poppinsItalic?: string | undefined;
    watermark?: string | undefined;
    euLogo?: string | undefined;
    spaceSuiteLogo?: string | undefined;
  }): number {
  doc.setFontSize(26).setFont('Poppins', 'bold');
  doc.setTextColor('#0e145d');

  const lines = doc.splitTextToSize(p.title, 170);
  const linesSize = lines.length * 10.4 * 1.35;
  y = checkEnd(doc, y, linesSize, assets);
  doc.text(lines, 20, y);
  y += linesSize;

  doc.setFontSize(10).setFont('Poppins', 'normal');

  doc.text(
    [p.createdAt as Date ? `Created: ${p.createdAt.toLocaleDateString()}` : null, p.updatedAt as Date ? `Updated: ${p.updatedAt.toLocaleDateString()}` : null]
      .filter(Boolean)
      .join(' | '), 
    20,
    y
  );
  y += 4 * 1.35;

  doc.text(
    [p.orgName, p.division ?? null, 'EQF ' + p.eqf]
      .filter(Boolean)
      .join(' | '),
    20,
    y
  );
  y += 4 * 1.35;

  return y;
}

/* ============================
  FOOTER
============================ */

function renderFooter(doc: jsPDF, assets: {
    poppinsRegular?: string | undefined;
    poppinsBold?: string | undefined;
    poppinsItalic?: string | undefined;
    watermark?: string | undefined;
    euLogo?: string | undefined;
    spaceSuiteLogo?: string | undefined;
  }, y = 275): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const footerHeight = doc.internal.pageSize.getHeight() - y;

  doc.setFillColor('#0e145d');
  doc.rect(0, y, pageWidth, footerHeight, 'F');

  const page = doc.getCurrentPageInfo().pageNumber;
  doc.setFontSize(9).setFont('Poppins', 'normal');
  doc.setTextColor('#ffffff');
  doc.text(page.toString(), pageWidth / 2, y + footerHeight / 2 + 1) // + 1 
  doc.setFontSize(10).setFont('Poppins', 'normal');
  doc.setTextColor('#0e145d');

  if (assets.euLogo) {
    const props = doc.getImageProperties(assets.euLogo);
    const imgWidthPx = props.width;
    const imgHeightPx = props.height
    const targetWidth = 30;
    const ratio = imgHeightPx / imgWidthPx;
    const targetHeight = targetWidth * ratio;
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.addImage(
      assets.euLogo,
      'PNG',
      pageWidth - targetWidth - 20,
      y + footerHeight / 2 - targetHeight / 2,
      targetWidth,
      targetHeight
    );
  }

  if (assets.spaceSuiteLogo) {
    const props = doc.getImageProperties(assets.spaceSuiteLogo);
    const imgWidthPx = props.width;
    const imgHeightPx = props.height
    const targetWidth = 30;
    const ratio = imgHeightPx / imgWidthPx;
    const targetHeight = targetWidth * ratio;
    doc.addImage(
      assets.spaceSuiteLogo,
      'PNG',
      20,
      y + footerHeight / 2 - targetHeight / 2,
      targetWidth,
      targetHeight
    );
  }
}

/* ============================
    SUMMARY
============================ */

function renderSummary(doc: jsPDF, p: OccupationalProfile, y: number, assets: {
    poppinsRegular?: string | undefined;
    poppinsBold?: string | undefined;
    poppinsItalic?: string | undefined;
    watermark?: string | undefined;
    euLogo?: string | undefined;
    spaceSuiteLogo?: string | undefined;
  }): number {
  if (!p.description) return y;

  y = sectionTitle(doc, 'Profile Summary', y, assets);

  y += 4 * 1.35;
  const lines = doc.splitTextToSize(p.description, 170);
  const linesSize = lines.length * 4 * 1.35;
  y = checkEnd(doc, y, linesSize, assets);
  doc.text(lines, 20, y);
  y += linesSize;

  return y;
}

/* ============================
    APPLICATION DOMAINS
============================ */

function renderDomains(doc: jsPDF, p: OccupationalProfile, y: number, assets: {
    poppinsRegular?: string | undefined;
    poppinsBold?: string | undefined;
    poppinsItalic?: string | undefined;
    watermark?: string | undefined;
    euLogo?: string | undefined;
    spaceSuiteLogo?: string | undefined;
  }): number {

  if (!p.fields.length) return y;

  const domains: string[] = p.fields.map((field) =>
    field.name + ' (' + field.grandparent + ')'
  );

  y = sectionTitle(doc, 'Application Domains', y, assets);

  y += 4 * 1.35;
  domains.forEach(domain => {
    const lines = doc.splitTextToSize(domain, 170);
    for (let i = 0; i < lines.length; i++) {
      if (i == 0) lines[i] = '• ' + lines[i];
      else lines[i] = '   ' + lines[i];
    }
    const linesSize = lines.length * 4 * 1.35;
    y = checkEnd(doc, y, linesSize, assets);
    doc.text(lines, 20, y);
    y += linesSize;
  });

  return y;
}

/* ============================
    KNOWLEDGE
============================ */

function renderKnowledge(doc: jsPDF, p: OccupationalProfile, y: number, assets: {
    poppinsRegular?: string | undefined;
    poppinsBold?: string | undefined;
    poppinsItalic?: string | undefined;
    watermark?: string | undefined;
    euLogo?: string | undefined;
    spaceSuiteLogo?: string | undefined;
  }): number {

  if (!p.fields.length) return y;

  y = sectionTitle(doc, 'Required Knowledge', y, assets);

  const knowledge = p.knowledge.map(k => extractConceptsFromKnowledgeAndSkills(k));

  y += 4 * 1.35;

  knowledge.forEach(knowledge => {
    const url = 'https://geospacebok.eu/' + (knowledge.concept != '' ? knowledge.concept : knowledge.content);
    const lines = doc.splitTextToSize(knowledge.content, 170);
    for (let i = 0; i < lines.length; i++) {
      if (i == 0) lines[i] = '• ' + lines[i];
      else lines[i] = '   ' + lines[i];
    }
    const linesSize = lines.length * 4 * 1.35;
    y = checkEnd(doc, y, linesSize, assets);
    doc.textWithLink(lines, 20, y, {url});
    y += linesSize;
  });

  return y;
}

/* ============================
    SKILLS
============================ */

function renderSkills(doc: jsPDF, p: OccupationalProfile, y: number, assets: {
    poppinsRegular?: string | undefined;
    poppinsBold?: string | undefined;
    poppinsItalic?: string | undefined;
    watermark?: string | undefined;
    euLogo?: string | undefined;
    spaceSuiteLogo?: string | undefined;
  }): number {

  if (!p.fields.length) return y;

  y = sectionTitle(doc, 'Required Skills', y, assets);

  const totalSkills: AnnotatedElement[] = p.skills.concat(p.customSkills).map(skill => extractConceptsFromKnowledgeAndSkills(skill));

  y += 4 * 1.35;
  totalSkills.forEach(skill => {
    const lines = doc.splitTextToSize(skill.content, 170);
    for (let i = 0; i < lines.length; i++) {
      if (i == 0) lines[i] = '• ' + lines[i];
      else lines[i] = '   ' + lines[i];
    }
    const linesSize = lines.length * 4 * 1.35;
    y = checkEnd(doc, y, linesSize, assets);
    if (skill.concept != '') doc.textWithLink(lines, 20, y, {url: 'https://geospacebok.eu/' + skill.concept});
    else doc.text(lines, 20, y);
    y += linesSize;
  });

  return y;
}

/* ============================
    TRANSVERSAL SKILLS
============================ */

function renderTransversalSkills(doc: jsPDF, p: OccupationalProfile, y: number, assets: {
    poppinsRegular?: string | undefined;
    poppinsBold?: string | undefined;
    poppinsItalic?: string | undefined;
    watermark?: string | undefined;
    euLogo?: string | undefined;
    spaceSuiteLogo?: string | undefined;
  }): number {

  if (!p.fields.length) return y;

  y = sectionTitle(doc, 'Required Transversal Skills', y, assets);

  const totalSkills: Competence[] = p.competences.concat(p.customCompetences.map(custom => { return {preferredLabel: custom}}));

  y += 4 * 1.35;
  totalSkills.forEach(skill => {
    const lines = doc.splitTextToSize(skill.preferredLabel, 170);
    for (let i = 0; i < lines.length; i++) {
      if (i == 0) lines[i] = '• ' + lines[i];
      else lines[i] = '   ' + lines[i];
    }
    const linesSize = lines.length * 4 * 1.35;
    y = checkEnd(doc, y, linesSize, assets);
    if (skill.uri) doc.textWithLink(lines, 20, y, {url: skill.uri});
    else doc.text(lines, 20, y);
    y += linesSize;
  });

  return y;
}

/* ============================
    HELPERS
============================ */

function sectionTitle(doc: jsPDF, title: string, y: number, assets: {
    poppinsRegular?: string | undefined;
    poppinsBold?: string | undefined;
    poppinsItalic?: string | undefined;
    watermark?: string | undefined;
    euLogo?: string | undefined;
    spaceSuiteLogo?: string | undefined;
  }): number {
  y += 8 * 1.35;
  y = checkEnd(doc, y, 0, assets);  
  doc.setFontSize(14).setFont('Poppins', 'bold');
  doc.setTextColor('#0e145d');
  doc.text(title, 20, y);
  doc.setFontSize(10).setFont('Poppins', 'normal');
  doc.setTextColor('#0e145d');
  return y + 2 * 1.35;
}

function checkEnd(doc: jsPDF, y: number, contentSize: number = 0, assets: {
    poppinsRegular?: string | undefined;
    poppinsBold?: string | undefined;
    poppinsItalic?: string | undefined;
    watermark?: string | undefined;
    euLogo?: string | undefined;
    spaceSuiteLogo?: string | undefined;
  }): number {
  if (y + contentSize > 270) {
    renderFooter(doc, assets);
    doc.addPage();
    addWatermark(doc, assets.watermark || '');
    return 20;
  }
  return y;
}

function addWatermark(doc: jsPDF, watermark: string): void {
  if (watermark) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.addImage(watermark, 'PNG', 0, 0, pageWidth, pageHeight);
  }
}

function buildFilename(p: OccupationalProfile): string {
  return `${p.title.replace(/\s+/g, '_')}_Profile.pdf`;
}

function extractConceptsFromKnowledgeAndSkills(element: string): AnnotatedElement {
  if (!element) return { concept: '', content: '' };
  const match = element.match(/^\[(.*?)\]\s*(.*)$/);
  if (!match) return {concept: '', content: element};
  return {concept: match[1], content: match[2]};
}


interface AnnotatedElement {
  concept: string;
  content: string;
}