import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  constructor(
    private title: Title,
    private route: ActivatedRoute) { }

  ngOnInit(): void {
    this.title.setTitle(this.route.snapshot.data['title']);
  }

}
