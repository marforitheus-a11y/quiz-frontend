import React from 'react'

export default function Hero({ onStart = ()=>{} }){
  return (
    <section className="grid md:grid-cols-2 gap-6 items-center">
      <div>
        <h1 className="text-3xl font-extrabold mb-2">Estude com questões geradas por IA</h1>
        <p className="text-gray-600 mb-4">Simulados personalizados, revisão com sugestões e geração de questões por tópico.</p>
        <div className="flex gap-3">
          <button onClick={onStart} className="bg-indigo-600 text-white px-4 py-2 rounded shadow">Começar</button>
          <button className="border px-4 py-2 rounded">Como funciona</button>
        </div>
      </div>
      <aside>
        <div className="bg-white p-4 rounded shadow">
          <div className="flex justify-between mb-2"><div>Usuários</div><div className="font-bold">1.2k</div></div>
          <div className="flex justify-between mb-2"><div>Questões</div><div className="font-bold">32k</div></div>
          <div className="flex justify-between"><div>Satisfação</div><div className="font-bold">98%</div></div>
        </div>
      </aside>
    </section>
  )
}
