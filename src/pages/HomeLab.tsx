import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getHomelab, meta } from '../content';
import { useStore } from '../state/store';
import { Md } from '../components/RichContent';
import { useAsync, Loading, Empty, Bar, useDocumentTitle } from '../components/ui';

export default function HomeLab() {
  useDocumentTitle('Home Lab');
  const { data: hl, loading } = useAsync(getHomelab, []);
  const checks = useStore((s) => s.homelabChecks);
  const setCheck = useStore((s) => s.setHomelabCheck);
  const [profile, setProfile] = useState(0);
  const [tab, setTab] = useState<'plan' | 'profiles' | 'network' | 'checklists' | 'guides'>('plan');
  if (loading) return <Loading what="ghidul de home lab" />;
  if (!hl) return <div className="page"><h1>Home Lab</h1><Empty title="Ghidul de home lab nu este încă disponibil." /></div>;
  const p = hl.profiles[profile];
  const totals = p.vms.reduce((a, v) => ({ vcpu: a.vcpu + v.vcpu, ram: a.ram + v.ramGb, disk: a.disk + v.diskGb }), { vcpu: 0, ram: 0, disk: 0 });
  const all = [...hl.dependencyChecklist, ...hl.readinessChecklist];
  const doneCount = all.filter((c) => checks[c.id]).length;
  const homelabLabs = meta.labs.filter((l) => l.id.startsWith('lab-homelab') || l.id === 'lab-network-readiness' || l.id === 'lab-esx-host-first-vm');

  const Checklist = ({ title, items }: { title: string; items: typeof hl.readinessChecklist }) => (
    <section className="panel">
      <h2>{title}</h2>
      <ul className="list">
        {items.map((c) => (
          <li key={c.id}>
            <label className="check">
              <input type="checkbox" checked={!!checks[c.id]} onChange={(e) => setCheck(c.id, e.target.checked)} />
              <span><span style={{ fontWeight: 550 }}>{c.item}</span><span className="small muted" style={{ display: 'block' }}>Cum verifici: <Md src={c.how} inline /></span></span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Construiește-ți home lab-ul VCF</h1>
          <p>Profiluri de hardware, plan IP/VLAN/DNS, checklist de dependențe și de pregătire, plus un plan concret pentru serverul tău Proxmox.</p>
        </div>
        <div style={{ width: 240 }}>
          <div className="small row between"><span>Pregătire lab</span><span>{doneCount}/{all.length}</span></div>
          <Bar value={all.length ? (doneCount / all.length) * 100 : 0} tone={doneCount === all.length ? 'ok' : undefined} label="Checklist home lab" />
        </div>
      </div>
      <div className="tabs" role="tablist">
        {([['plan', 'Lab-ul tău'], ['profiles', 'Profiluri'], ['network', 'IP / VLAN / DNS'], ['checklists', 'Checklist-uri'], ['guides', 'Ghiduri']] as const).map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === 'plan' && (
        <div className="stack" style={{ gap: 14 }}>
          <section className="panel"><Md src={hl.intro} /></section>
          <section className="panel"><h2>Planul pentru serverul tău</h2><Md src={hl.yourLab} /></section>
          <section className="panel">
            <h2>Platforme de virtualizare pentru lab</h2>
            <div className="table-wrap"><table className="table"><thead><tr><th>Platformă</th><th>Verdict</th><th>Note</th></tr></thead>
              <tbody>{hl.platforms.map((pl) => <tr key={pl.id}><td style={{ fontWeight: 600 }}>{pl.name}</td><td>{pl.verdict}</td><td className="small"><Md src={pl.notes} /></td></tr>)}</tbody></table></div>
          </section>
          {homelabLabs.length > 0 && (
            <section className="panel"><h2>Laboratoare de construcție</h2><ul className="list">{homelabLabs.map((l) => <li key={l.id}><Link to={`/labs/${l.id}`}>{l.title}</Link></li>)}</ul></section>
          )}
        </div>
      )}

      {tab === 'profiles' && (
        <div className="stack" style={{ gap: 14 }}>
          <div className="seg" role="tablist" aria-label="Profil">{hl.profiles.map((pr, i) => <button key={pr.id} type="button" role="tab" aria-selected={profile === i} onClick={() => setProfile(i)}>{pr.name}</button>)}</div>
          <section className="panel stack">
            <div><h2 style={{ margin: 0 }}>{p.name}</h2><p className="muted" style={{ margin: 0 }}>{p.purpose}</p></div>
            <div className="facts">
              <div className="fact"><div className="k">CPU</div><div className="v small">{p.cpu}</div></div>
              <div className="fact"><div className="k">RAM</div><div className="v small">{p.ram}</div></div>
              <div className="fact"><div className="k">Disc</div><div className="v small">{p.disk}</div></div>
              <div className="fact"><div className="k">NIC-uri</div><div className="v small">{p.nics}</div></div>
              <div className="fact"><div className="k">Consum estimat VM-uri</div><div className="v small">{totals.vcpu} vCPU · {totals.ram} GB RAM · {totals.disk} GB disc</div></div>
            </div>
            <div className="grid grid-3">
              <div><div className="section-label">Layout storage</div><div className="small"><Md src={p.storageLayout} /></div></div>
              <div><div className="section-label">Virtualizare nested</div><div className="small"><Md src={p.nested} /></div></div>
              <div><div className="section-label">Rețea</div><div className="small"><Md src={p.network} /></div></div>
            </div>
            <div className="table-wrap"><table className="table"><thead><tr><th>VM</th><th>Rol</th><th>vCPU</th><th>RAM (GB)</th><th>Disc (GB)</th><th>Note</th></tr></thead>
              <tbody>{p.vms.map((v) => <tr key={v.name}><td className="mono small">{v.name}</td><td className="small">{v.role}</td><td>{v.vcpu}</td><td>{v.ramGb}</td><td>{v.diskGb}</td><td className="small">{v.notes}</td></tr>)}</tbody></table></div>
            <div className="callout warning"><div className="callout-title">Limitări (spuse sincer)</div><ul>{p.limitations.map((l) => <li key={l}>{l}</li>)}</ul></div>
          </section>
        </div>
      )}

      {tab === 'network' && (
        <div className="stack" style={{ gap: 14 }}>
          <section className="panel"><h2>Plan VLAN</h2>
            <div className="table-wrap"><table className="table"><thead><tr><th>VLAN</th><th>Nume</th><th>Subnet</th><th>Gateway</th><th>MTU</th><th>Scop</th></tr></thead>
              <tbody>{hl.vlanPlan.map((v) => <tr key={v.vlan}><td>{v.vlan}</td><td>{v.name}</td><td className="mono small">{v.subnet}</td><td className="mono small">{v.gateway}</td><td>{v.mtu}</td><td className="small">{v.purpose}</td></tr>)}</tbody></table></div>
          </section>
          <section className="panel"><h2>Plan IP</h2>
            <div className="table-wrap"><table className="table"><thead><tr><th>Hostname</th><th>FQDN</th><th>IP</th><th>VLAN</th><th>Rol</th></tr></thead>
              <tbody>{hl.ipPlan.map((r) => <tr key={r.fqdn + r.ip}><td className="mono small">{r.hostname}</td><td className="mono small">{r.fqdn}</td><td className="mono small">{r.ip}</td><td>{r.vlan}</td><td className="small">{r.role}</td></tr>)}</tbody></table></div>
          </section>
          <section className="panel"><h2>Plan DNS</h2><Md src={hl.dnsPlan} /></section>
          <section className="panel"><h2>Convenții de denumire</h2><Md src={hl.naming} /></section>
        </div>
      )}

      {tab === 'checklists' && (
        <div className="grid grid-2">
          <Checklist title="Checklist de dependențe" items={hl.dependencyChecklist} />
          <Checklist title="Checklist de pregătire pentru deployment" items={hl.readinessChecklist} />
        </div>
      )}

      {tab === 'guides' && (
        <div className="stack" style={{ gap: 14 }}>
          {hl.sections.map((s) => <section key={s.id} id={s.id} className="panel"><h2>{s.title}</h2><Md src={s.body} /></section>)}
          <section className="panel small"><div className="section-label">Surse</div><ul>{hl.sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a></li>)}</ul></section>
        </div>
      )}
    </div>
  );
}
