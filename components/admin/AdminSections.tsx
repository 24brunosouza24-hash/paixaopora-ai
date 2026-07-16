"use client"

import { ReactNode, useState } from "react"

type Props = {
  caixa: ReactNode
  grafico: ReactNode
  maisVendidos: ReactNode
  historico: ReactNode
}

export default function AdminSections({
  caixa,
  grafico,
  maisVendidos,
  historico,
}: Props) {
  const [sections, setSections] = useState({
    caixa: true,
    grafico: false,
    maisVendidos: false,
    historico: false,
  })

  function toggle(key: keyof typeof sections) {
    setSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const buttonStyle = {
    width: "100%",
    marginTop: 12,
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,.2)",
    background: "rgba(255,255,255,.12)",
    color: "#fff",
    fontWeight: 900,
    textAlign: "left" as const,
    cursor: "pointer",
  }

  return (
    <>
      <button style={buttonStyle} onClick={() => toggle("caixa")}>
        {sections.caixa ? "▼" : "▶"} Caixa
      </button>
      {sections.caixa && caixa}

      <button style={buttonStyle} onClick={() => toggle("grafico")}>
        {sections.grafico ? "▼" : "▶"} Gráfico
      </button>
      {sections.grafico && grafico}

      <button style={buttonStyle} onClick={() => toggle("maisVendidos")}>
        {sections.maisVendidos ? "▼" : "▶"} Produtos mais vendidos
      </button>
      {sections.maisVendidos && maisVendidos}

      <button style={buttonStyle} onClick={() => toggle("historico")}>
        {sections.historico ? "▼" : "▶"} Histórico de caixa
      </button>
      {sections.historico && historico}
    </>
  )
}