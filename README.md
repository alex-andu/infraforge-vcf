# InfraForge VCF — platformă de învățare VMware Cloud Foundation 9

Platformă locală, pentru un singur utilizator, care te pregătește pentru examenul **VCP-VCF Administrator (2V0-17.25)** și pentru operarea reală a VCF 9.x. Interfața este în română, conținutul tehnic în engleză (ca documentația și examenul).

**Moduri:** Învață (lecții pe 16 faze), Laboratoare (ghidate pe home lab-ul tău), Troubleshooting (simulator de incidente), Examen (practică, examene simulate 60 întrebări / 135 min, recapitulare spaced repetition). Plus Arhitectură interactivă, Home Lab Builder, Glosar, Referință comenzi/API, căutare globală (Ctrl K), plan de studiu, notițe și bookmark-uri.

## Deployment pe Proxmox (recomandat)

1. Creează un LXC Debian 12 (2 vCPU, 2 GB RAM, 8 GB disc; bifează *Nesting* la Features) sau un VM.
2. Copiază folderul proiectului în LXC (de ex. `scp -r infraforge-vcf root@<ip-lxc>:/opt/`).
3. În LXC:
   ```bash
   cd /opt/infraforge-vcf
   ./deploy/install-proxmox-lxc.sh
   ```
4. Deschide `http://<ip-lxc>:8080` din browser. Portul se schimbă cu `INFRAFORGE_PORT=80 docker compose up -d`.

Actualizare după modificări: `docker compose up -d --build`.

### Fără Docker
```bash
npm ci && npm run build   # rezultatul static este în dist/
```
Servește `dist/` cu orice server web, cu fallback la `index.html` pentru rute (vezi `deploy/nginx.conf`).

## Progresul tău

Progresul se salvează în browser (IndexedDB), pe calculatorul de pe care înveți. Fă backup din **Setări → Export** și îl poți importa pe alt browser. Ștergerea datelor browserului șterge progresul.

## Dezvoltare

```bash
npm install
npm run dev             # server de dezvoltare pe :5173
npm test                # teste unitare pentru motoare
npm run content:check   # validează conținutul
npm run build           # validare + typecheck + build de producție
```

## Documentație

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): structura aplicației și fluxul de date
- [docs/CONTENT_GUIDE.md](docs/CONTENT_GUIDE.md): cum adaugi o lecție, întrebări, un laborator, un incident sau un scenariu
- [docs/MASTERY.md](docs/MASTERY.md): cum se calculează stăpânirea, recapitularea și scorul de pregătire

## Surse și imagini

Fiecare lecție listează sursele (documentația oficială Broadcom TechDocs, ghidul oficial de examen). Imaginile oficiale sunt afișate direct de pe techdocs.broadcom.com, cu sursa menționată, doar pentru uz personal de studiu.
