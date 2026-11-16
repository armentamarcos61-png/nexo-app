/** Accept Mexican amounts with or without thousands separators.
 * The entire input must match; malformed grouping is never silently truncated.
 * Examples: 6000, 6,000, 6.000, 6,000.50, 6.000,50.
 */
export function parseMxnAmount(raw:string):number|null {
  const value=raw.trim().replace(/\s/g,'');
  if(!value)return null;
  let numeric='';
  if(/^\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?$/.test(value)){
    numeric=value.replace(/,/g,'');
  }else if(/^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(value)){
    numeric=value.replace(/\./g,'').replace(',','.');
  }else if(/^\d+(?:[.,]\d{1,2})?$/.test(value)){
    numeric=value.replace(',','.');
  }else throw Error('Importe inválido. Usa, por ejemplo, 6000, 6,000 o 6,000.50.');
  const amount=Number(numeric);
  if(!Number.isFinite(amount) || amount<=0 || amount>9999999999.99)
    throw Error('Escribe un importe válido mayor que cero.');
  return Math.round((amount+Number.EPSILON)*100)/100;
}
export function formatMxnAmount(amount:number|null):string{
  return amount==null?'Por acordar':amount.toLocaleString('es-MX',{style:'currency',currency:'MXN'});
}
