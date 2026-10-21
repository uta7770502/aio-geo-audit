import {splitRecommendation} from './recommendation-text';
export default function RecommendationText({text}){
 return <span style={{whiteSpace:'pre-line',overflowWrap:'anywhere'}}>{splitRecommendation(text).map((part,i)=>part.url?<a key={i} href={part.url} target="_blank" rel="noopener noreferrer">{part.text}</a>:<span key={i}>{part.text}</span>)}</span>;
}
