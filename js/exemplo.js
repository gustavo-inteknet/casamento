// Dados usados apenas no modo demonstração (quando CONFIG.apiUrl está vazio).
const BASE = [
  ['passagens', 'Passagens da lua de mel', 'Para a gente chegar ao paraíso (de preferência na janela).', 3000, 30, 12],
  ['hotel', 'Diárias num hotel pé na areia', 'Acordar com barulho de mar e sem despertador.', 2400, 24, 5],
  ['jantar', 'Jantar romântico à luz de velas', 'Uma noite especial, sem louça para lavar.', 600, 6, 2],
  ['barco', 'Passeio de barco ao pôr do sol', 'O pôr do sol mais bonito da viagem, visto do mar.', 500, 10, 0],
  ['geladeira', 'Geladeira nova (que não faz barulho)', 'Silenciosa, espaçosa e sempre cheia de coisa boa.', 4000, 40, 8],
  ['sofa', 'Sofá para maratonar séries', 'Confortável o bastante para "só mais um episódio".', 3000, 30, 3],
  ['airfryer', 'Air fryer para o noivo aprender a cozinhar', 'Um voto de confiança nos dotes culinários do noivo.', 500, 10, 10],
  ['cafe', 'Máquina de café para sobreviver às segundas', 'Combustível oficial das segundas-feiras.', 800, 16, 4],
  ['churrasco', 'Kit churrasco para os domingos em família', 'Para reunir família e amigos aos domingos.', 400, 8, 0],
  ['mercado', 'Primeira compra do mercado a dois', 'O primeiro carrinho cheio da nossa casa.', 300, 6, 1],
  ['plantinha', 'Plantinha para testar se estamos prontos para um pet', 'Se ela sobreviver, pensamos no cachorro.', 100, 2, 0],
  ['pizza', 'Pizza de reconciliação da primeira briga', 'Porque toda discussão termina melhor com pizza.', 150, 3, 0],
  ['sogra', 'Seguro contra a sogra', 'Cobertura completa para visitas surpresa. (Brincadeira, sogrinha!)', 250, 5, 0],
  ['livre', 'Contribua com o que o coração mandar', 'Escolha o valor que desejar. Todo carinho é bem-vindo.', 0, 0, 0],
];

export const PRESENTES_EXEMPLO = BASE.map(([id, nome, descricao, total, qtd, vendidas], i) => ({
  id,
  nome,
  descricao,
  icone: id,
  imagem: '',
  valor_total: total,
  qtd_cotas: qtd,
  valor_cota: qtd ? Math.round((total / qtd) * 100) / 100 : 0,
  cotas_vendidas: vendidas,
  livre: qtd === 0,
  esgotado: qtd > 0 && vendidas >= qtd,
  ordem: i + 1,
}));
