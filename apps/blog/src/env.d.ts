/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    /** 관리자 세션이 있을 때만 채운다(middleware). */
    viewer?: { id: string; email: string; name: string; exp: number };
  }
}
