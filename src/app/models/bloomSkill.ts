export class BloomSkill {
  level: number;
  verb: string;
  label: string;
  concept: string;

  constructor(bloomSkill: Partial<BloomSkill> | undefined = undefined) {
    this.level = bloomSkill?.level || 0;
    this.verb = bloomSkill?.verb || '';
    this.label = bloomSkill?.label || '';
    this.concept = bloomSkill?.concept || '';
  }

  public toPlainObject(): any {
    return {
      level: this.level,
      verb: this.verb,
      label: this.label,
      concept: this.concept,
    };
  }
}
