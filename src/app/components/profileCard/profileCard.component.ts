import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BokInformationService } from '@eo4geo/ngx-bok-visualization';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { OccupationalProfile } from '../../models/occupationalProfile';
import { UtilsService } from '../../services/utils.service';

@Component({
  standalone: true,
  selector: 'profile-card',
  templateUrl: './profileCard.component.html',
  styleUrl: './profileCard.component.css',
  imports: [CommonModule, ButtonModule, CardModule, TagModule, TooltipModule],
})
export class ProfileCardComponent implements OnInit {
  @Input() occupationalProfile!: OccupationalProfile;

  concepts: string[] = [];
  selectedConceptsColor: Map<string, string> = new Map();
  selectedConceptsTooltip: Map<string, string> = new Map();

  constructor(
    private bokInfo: BokInformationService,
    private utilsService: UtilsService,
    private router: Router
  ) {}

  ngOnInit() {
    this.occupationalProfile.knowledge.forEach((concept) => {
      this.concepts.push(concept);

      this.bokInfo.getConceptColor(concept).subscribe((color) => {
        const softColor = color
          ? this.utilsService.convertHexToRgba(color, 0.5)
          : '';

        this.selectedConceptsColor.set(concept, softColor);
      });

      this.bokInfo
        .getConceptName(concept)
        .subscribe((tooltip) =>
          this.selectedConceptsTooltip.set(
            concept,
            tooltip ? tooltip : 'Deprecated concept'
          )
        );
    });

    this.concepts.sort();
  }

  onClickConcept(code: string): void {
    window.open('https://geospacebok.eu/' + code);
  }

  onClickTitle(event: MouseEvent): void {
    event.preventDefault();
    this.router.navigate(['profile/' + this.occupationalProfile._id]);
  }
}
