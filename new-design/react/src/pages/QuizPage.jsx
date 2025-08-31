import React from 'react'

function Option({ letter, text, onClick, state }){
  const base = 'p-3 rounded border cursor-pointer flex gap-3 items-center'
  const stateClass = state === 'correct' ? 'bg-green-50 border-green-300' : state === 'incorrect' ? 'bg-red-50 border-red-300' : 'bg-white border-gray-100'
  return <div className={base + ' ' + stateClass} onClick={onClick}><div className="font-bold">{letter}</div><div>{text}</div></div>
}

export default function QuizPage(){
  const [question, setQuestion] = React.useState({ id:1, question: 'Qual é a capital do Brasil?', options: ['São Paulo','Brasília','Rio','Salvador'], answer: 'Brasília' })
  const [selected, setSelected] = React.useState(null)
  const [state, setState] = React.useState({})
  function submit(){
    const isCorrect = (selected && selected === question.answer)
    if(isCorrect) setState({[selected]: 'correct'})
    else setState({[selected]: 'incorrect', [question.answer]: 'correct'})
    // small delay then next
    setTimeout(()=>{ setSelected(null); setState({}); /* fetch next question */ }, 1200)
  }
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white p-6 rounded shadow">
        <div className="mb-4 text-xl font-semibold">{question.question}</div>
        <div className="grid gap-3">
          {question.options.map((o,i)=> <Option key={i} letter={['A','B','C','D'][i]} text={o} onClick={()=>setSelected(o)} state={state[o]} />)}
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={submit} disabled={!selected} className="px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-50">Responder</button>
        </div>
      </div>
    </div>
  )
}
