export const toWareki = (dateStr: string): string => {
  if (!dateStr) return ''

  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''

  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  let era = ''
  let eraYear = 0

  if (year >= 2019 && (year > 2019 || month > 4 || (month === 5 && day >= 1))) {
    era = '令和'
    eraYear = year - 2018
  } else if (year >= 1989 && (year > 1989 || month > 1 || (month === 1 && day >= 8))) {
    era = '平成'
    eraYear = year - 1988
  } else if (year >= 1926 && (year > 1926 || month > 12 || (month === 12 && day >= 25))) {
    era = '昭和'
    eraYear = year - 1925
  } else if (year >= 1912 && (year > 1912 || month > 7 || (month === 7 && day >= 30))) {
    era = '大正'
    eraYear = year - 1911
  } else if (year >= 1868) {
    era = '明治'
    eraYear = year - 1867
  } else {
    return `${year}年${month}月${day}日`
  }

  const eraYearStr = eraYear === 1 ? '元' : `${eraYear}`
  return `${era}${eraYearStr}年${month}月${day}日`
}

export const useWareki = (dateStr: string): string => {
  return toWareki(dateStr)
}
