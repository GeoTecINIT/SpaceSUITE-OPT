export class OccupationalProfile {
  _id: string;
  competences: Competence[];
  createdAt?: any;
  customCompetences: string[];
  customSkills: string[];
  description: string;
  division: string;
  eqf: string;
  fields: Field[];
  isPublic: boolean;
  knowledge: string[];
  lastModified: string;
  orgId: string;
  orgName: string;
  skills: string[];
  title: string;
  updatedAt?: any;
  userId: string;

  constructor(data: Partial<OccupationalProfile> = {}) {
    this._id = data._id ?? '';
    this.competences = data.competences ?? [];
    this.createdAt = data.createdAt;
    this.customCompetences = data.customCompetences ?? [];
    this.customSkills = data.customSkills ?? [];
    this.description = data.description ?? '';
    this.division = data.division ?? '';
    this.eqf = data.eqf ?? '';
    this.fields = data.fields ?? [];
    this.isPublic = data.isPublic ?? true;
    this.knowledge = data.knowledge ?? [];
    this.lastModified = data.lastModified ?? '';
    this.orgId = data.orgId ?? '';
    this.orgName = data.orgName ?? '';
    this.skills = data.skills ?? [];
    this.title = data.title ?? '';
    this.updatedAt = data.updatedAt;
    this.userId = data.userId ?? '';
  }

  static fromFirestore(data: any): OccupationalProfile {
    return new OccupationalProfile({
      ...data,
      eqf: data.eqf != null ? String(data.eqf) : '',
    });
  }

  toPlain(): Record<string, any> {
    return {
      _id: this._id,
      competences: this.competences,
      createdAt: this.createdAt,
      customCompetences: this.customCompetences,
      customSkills: this.customSkills,
      description: this.description,
      division: this.division,
      eqf: this.eqf ? Number(this.eqf) : null,
      fields: this.fields,
      isPublic: this.isPublic,
      knowledge: this.knowledge,
      lastModified: this.lastModified,
      orgId: this.orgId,
      orgName: this.orgName,
      skills: this.skills,
      title: this.title,
      updatedAt: this.updatedAt,
      userId: this.userId,
    };
  }
}

export interface Competence {
  altLabels?: string[];
  description?: string;
  preferredLabel: string;
  reuseLevel?: string;
  skillType?: string;
  uri?: string;
}

export interface Field {
  code: string;
  concatName: string;
  grandparent: string;
  greatgrandparent: string;
  name: string;
  parent: string;
}
