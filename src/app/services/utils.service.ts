import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class UtilsService {
  codeToKnowledgeArea: Map<string, string> = new Map([
    ['AM', 'Analytical Methods'],
    ['CF', 'Conceptual Foundations'],
    ['CV', 'Cartography and Visualization'],
    ['DA', 'Design and Setup of Geographic Information Systems'],
    ['DM', 'Data Modeling, Storage and Exploitation'],
    ['GC', 'Geocomputation'],
    ['GD', 'Geospatial Data'],
    ['GN', 'GNSS'],
    ['GS', 'GI and Society'],
    ['IP', 'Image processing and analysis'],
    ['OI', 'Organizational and Institutional Aspects'],
    ['PP', 'Physical principles'],
    ['PS', 'Platforms, sensors and digital imagery'],
    ['SA', 'Satellite Systems'],
    ['SC', 'Satellite Communication'],
    ['TA', 'Thematic and application domains'],
    ['WB', 'Web-based GI'],
  ]);

  knowledgeAreaToCode: Map<string, string> = new Map([
    ['Analytical Methods', 'AM'],
    ['Conceptual Foundations', 'CF'],
    ['Cartography and Visualization', 'CV'],
    ['Design and Setup of Geographic Information Systems', 'DA'],
    ['Data Modeling, Storage and Exploitation', 'DM'],
    ['Geocomputation', 'GC'],
    ['Geospatial Data', 'GD'],
    ['GNSS', 'GN'],
    ['GI and Society', 'GS'],
    ['Image processing and analysis', 'IP'],
    ['Organizational and Institutional Aspects', 'OI'],
    ['Physical principles', 'PP'],
    ['Platforms, sensors and digital imagery', 'PS'],
    ['Satellite Systems', 'SA'],
    ['Satellite Communication', 'SC'],
    ['Thematic and application domains', 'TA'],
    ['Web-based GI', 'WB'],
  ]);

  convertHexToRgba(hex: string, alpha: number): string {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
