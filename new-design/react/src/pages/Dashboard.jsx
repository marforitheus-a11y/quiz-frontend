import React from 'react'

export default function Dashboard(){
  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="p-4 bg-white rounded shadow">
        <h3 className="font-bold">Progresso</h3>
        <p className="text-sm text-gray-500">Seu desempenho por tópicos</p>
      </div>
      <div className="p-4 bg-white rounded shadow">
        <h3 className="font-bold">Histórico</h3>
        <p className="text-sm text-gray-500">Últimos simulados</p>
      </div>
      <div className="p-4 bg-white rounded shadow">
        <h3 className="font-bold">Recomendações</h3>
        <p className="text-sm text-gray-500">O que estudar agora</p>
      </div>
    </div>
  )
}
