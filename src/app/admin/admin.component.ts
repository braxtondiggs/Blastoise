import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Title } from '@angular/platform-browser';
@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent implements OnInit {
  public title: string = this.route.snapshot.data['title'];

  constructor(
    private titleService: Title,
    private route: ActivatedRoute) { }

  ngOnInit(): void {
    this.titleService.setTitle(this.title);
  }

}
