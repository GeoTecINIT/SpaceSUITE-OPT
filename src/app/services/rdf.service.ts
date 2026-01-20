import { Injectable } from '@angular/core';
import {
  Competence,
  Field,
  OccupationalProfile,
} from '../models/occupationalProfile';

@Injectable({
  providedIn: 'root',
})
export class RdfService {
  /* ============================
     Public API
     ============================ */

  getRdfTtlUrl(model: OccupationalProfile): string {
    const blob = new Blob([this.convertModelToTurtle(model)], {
      type: 'text/ttl',
    });
    return window.URL.createObjectURL(blob);
  }

  getRdfXmlUrl(model: OccupationalProfile): string {
    const blob = new Blob([this.convertModelToRdfXml(model)], {
      type: 'text/xml',
    });
    return window.URL.createObjectURL(blob);
  }

  getRdfaUrl(model: OccupationalProfile): string {
    const blob = new Blob([this.convertModelToRDFa(model)], {
      type: 'text/html',
    });
    return window.URL.createObjectURL(blob);
  }

  /* ============================
     Turtle
     ============================ */

  private convertModelToTurtle(model: OccupationalProfile): string {
    let additionalObjects = '';

    let ttl = `@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix elm: <http://data.europa.eu/snb/model/elm> .
@prefix geospacebok: <https://geospacebok.eu/> .
@prefix esco: <http://data.europa.eu/esco/model#> .

`;

    ttl += `geospacebok:OccupationalProfile rdf:type rdfs:Class .\n`;

    ttl += `<https://geospacebok.eu/ocuprofiles/${model._id}> a geospacebok:OccupationalProfile ;\n`;

    if (model.title) ttl += `  dcterms:title "${this.escape(model.title)}" ;\n`;

    if (model.description)
      ttl += `  dcterms:description "${this.escape(model.description)}" ;\n`;

    if (model.orgName)
      ttl += `  dcterms:publisher "${this.escape(model.orgName)}${model.division ? ' - ' + this.escape(model.division) : ''}"  ;\n`;

    if (model.updatedAt)
      ttl += `  dcterms:modified "${model.updatedAt instanceof Date ? model.updatedAt.toISOString() : model.updatedAt.toDate().toISOString()}" ;\n`;

    if (model.eqf) ttl += `  elm:EQFLevel "${this.escape(model.eqf)}" ;\n`;

    if (model.fields && model.fields.length != 0) {
      model.fields.forEach((field: Field) => {
        ttl += `  elm:ISCEDFCode "${this.escape(field.code)}" ;\n`;
      });
    }

    if (model.knowledge && model.knowledge.length != 0) {
      model.knowledge.forEach((subj: string) => {
        ttl += `  dcterms:subject geospacebok:${subj} ;\n`;
      });
    }

    if (model.skills.length != 0 || model.customSkills.length != 0) {
      model.skills
        .concat(model.customSkills)
        .forEach((skill: string, index: number) => {
          ttl += `  esco:relatedEssentialSkill _:SKILL${index};\n`;
          additionalObjects += `_:SKILL${index}\n`;
          additionalObjects += `  rdf:type esco:Skill ;\n`;
          additionalObjects += `  dcterms:title "${this.escape(skill)}" .\n\n`;
        });
    }

    if (model.competences.length != 0 || model.customCompetences.length != 0) {
      model.competences.forEach((transversalSkill: Competence) => {
        ttl += `  esco:relatedEssentialSkills <${transversalSkill.uri}> ;\n`;
      });
      model.customCompetences.forEach(
        (transversalSkill: string, index: number) => {
          ttl += `  esco:relatedEssentialSkill _:TRANSVERSAL${index} ;\n`;
          additionalObjects += `_:TRANSVERSAL${index}\n`;
          additionalObjects += `  rdf:type esco:Skill ;\n`;
          additionalObjects += `  dcterms:title "${this.escape(transversalSkill)}" .\n\n`;
        },
      );
    }

    ttl = ttl.trim().replace(/;$/, '.') + '\n\n';
    ttl += additionalObjects;

    return ttl;
  }

  /* ============================
     RDF/XML
     ============================ */

  private convertModelToRdfXml(model: OccupationalProfile): string {
    const NS = {
      rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
      rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
      dcterms: 'http://purl.org/dc/terms/',
      elm: 'http://data.europa.eu/snb/model/elm',
      esco: 'http://data.europa.eu/esco/model#',
      geospacebok: 'https://geospacebok.eu/',
    };

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<rdf:RDF
        xmlns:rdf="${NS.rdf}"
        xmlns:rdfs="${NS.rdfs}"
        xmlns:dcterms="${NS.dcterms}"
        xmlns:elm="${NS.elm}"
        xmlns:esco="${NS.esco}"
        xmlns:geospacebok="${NS.geospacebok}"
    >\n\n`;

    xml += `  <rdf:Description rdf:about="${NS.geospacebok}OccupationalProfile">\n`;
    xml += `    <rdf:type rdf:resource="${NS.rdfs}Class"/>\n`;
    xml += `  </rdf:Description>\n\n`;

    const profileUri = `${NS.geospacebok}ocuprofiles/${model._id}`;

    xml += `  <rdf:Description rdf:about="${profileUri}">\n`;
    xml += `    <rdf:type rdf:resource="${NS.geospacebok}OccupationalProfile"/>\n`;

    if (model.title)
      xml += `    <dcterms:title>${this.escapeXml(model.title)}</dcterms:title>\n`;

    if (model.description)
      xml += `    <dcterms:description>${this.escapeXml(model.description)}</dcterms:description>\n`;

    if (model.orgName)
      xml += `    <dcterms:publisher>${this.escapeXml(
        model.orgName + (model.division ? ' - ' + model.division : ''),
      )}</dcterms:publisher>\n`;

    if (model.updatedAt) {
      const dt =
        model.updatedAt instanceof Date
          ? model.updatedAt.toISOString()
          : model.updatedAt.toDate().toISOString();
      xml += `    <dcterms:modified>${this.escapeXml(dt)}</dcterms:modified>\n`;
    }

    if (model.eqf)
      xml += `    <elm:EQFLevel>${this.escapeXml(model.eqf)}</elm:EQFLevel>\n`;

    if (model.fields?.length) {
      model.fields.forEach((field: Field) => {
        xml += `    <elm:ISCEDFCode>${this.escapeXml(field.code)}</elm:ISCEDFCode>\n`;
      });
    }

    if (model.knowledge?.length) {
      model.knowledge.forEach((subj: string) => {
        xml += `    <dcterms:subject rdf:resource="${NS.geospacebok}${subj}"/>\n`;
      });
    }

    if (model.skills.length || model.customSkills.length) {
      model.skills.concat(model.customSkills).forEach((skill: string) => {
        xml += `    <esco:relatedEssentialSkill>\n`;
        xml += `      <rdf:Description>\n`;
        xml += `        <rdf:type rdf:resource="${NS.esco}Skill"/>\n`;
        xml += `        <dcterms:title>${this.escapeXml(skill)}</dcterms:title>\n`;
        xml += `      </rdf:Description>\n`;
        xml += `    </esco:relatedEssentialSkill>\n`;
      });
    }

    if (model.competences.length || model.customCompetences.length) {
      model.competences.forEach((comp: Competence) => {
        xml += `    <esco:relatedEssentialSkill rdf:resource="${comp.uri}"/>\n`;
      });

      model.customCompetences.forEach((label: string) => {
        xml += `    <esco:relatedEssentialSkill>\n`;
        xml += `      <rdf:Description>\n`;
        xml += `        <rdf:type rdf:resource="${NS.esco}Skill"/>\n`;
        xml += `        <dcterms:title>${this.escapeXml(label)}</dcterms:title>\n`;
        xml += `      </rdf:Description>\n`;
        xml += `    </esco:relatedEssentialSkill>\n`;
      });
    }

    xml += `  </rdf:Description>\n\n`;
    xml += `</rdf:RDF>\n`;

    return xml;
  }

  /* ============================
      RDFa 
      ============================ */

  private convertModelToRDFa(model: OccupationalProfile): string {
    const NS = {
      geospacebok: 'https://geospacebok.eu/',
      dcterms: 'http://purl.org/dc/terms/',
      esco: 'http://data.europa.eu/esco/model#',
      elm: 'http://data.europa.eu/snb/model/elm',
    };

    const escape = (v: string) => this.escapeHtml(v);

    let html = `
  <div
    vocab="${NS.dcterms}"
    prefix="
      geospacebok: ${NS.geospacebok}
      esco: ${NS.esco}
      elm: ${NS.elm}
    "
    about="${NS.geospacebok}ocuprofiles/${model._id}"
    typeof="geospacebok:OccupationalProfile"
  >
  `;

    if (model.title)
      html += `  <h1 property="title">${escape(model.title)}</h1>\n`;

    if (model.description)
      html += `  <p property="description">${escape(model.description)}</p>\n`;

    if (model.orgName)
      html += `  <span property="publisher">${escape(
        model.orgName + (model.division ? ' - ' + model.division : ''),
      )}</span><br/>\n`;

    if (model.updatedAt) {
      const dt =
        model.updatedAt instanceof Date
          ? model.updatedAt.toISOString()
          : model.updatedAt.toDate().toISOString();
      html += `  <time property="modified" datetime="${dt}">${dt}</time><br/>\n`;
    }

    if (model.eqf)
      html += `  <span property="elm:EQFLevel">${escape(model.eqf)}</span><br/>\n`;

    if (model.fields?.length) {
      model.fields.forEach((field: Field) => {
        html += `  <span property="elm:ISCEDFCode">${escape(field.code)}</span><br/>\n`;
      });
    }

    if (model.knowledge?.length) {
      model.knowledge.forEach((subj: string) => {
        html += `  <link property="subject" href="${NS.geospacebok}${subj}"/>\n`;
      });
    }

    if (model.skills.length || model.customSkills.length) {
      model.skills.concat(model.customSkills).forEach((skill: string) => {
        html += `
    <div property="esco:relatedEssentialSkill" typeof="esco:Skill">
      <span property="title">${escape(skill)}</span>
    </div>
  `;
      });
    }

    if (model.competences.length || model.customCompetences.length) {
      model.competences.forEach((comp: Competence) => {
        html += `  <link property="esco:relatedEssentialSkill" href="${comp.uri}"/>\n`;
      });

      model.customCompetences.forEach((label: string) => {
        html += `
    <div property="esco:relatedEssentialSkill" typeof="esco:Skill">
      <span property="title">${escape(label)}</span>
    </div>
  `;
      });
    }

    html += `</div>\n`;

    return html;
  }

  /* ============================
     Escaping helpers
     ============================ */

  private escape(str: string): string {
    console.log('Escaping string:', str);
    const inlineString: string = str
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join(' ');
    return inlineString.replace(
      /[<>&'"]/g,
      (c) =>
        ({
          '<': '&lt;',
          '>': '&gt;',
          '&': '&amp;',
          "'": '&apos;',
          '"': '&quot;',
        })[c]!,
    );
  }

  private escapeXml(str: string): string {
    return this.escape(str);
  }

  private escapeHtml(str: string): string {
    return str.replace(
      /[<>&]/g,
      (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]!,
    );
  }
}
