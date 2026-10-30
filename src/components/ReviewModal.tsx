import { useState } from 'react';
import { Star } from 'lucide-react';
import { useApp } from '../store';
import { cn } from '../utils';
import { Button, Modal, Stars, useToast } from './UI';

const STUDENT_TAGS = ['环境好', '有人带', '结算及时', '沟通顺畅', '工作不累', '还会再来'];
const MERCHANT_TAGS = ['准时', '上手快', '沟通好', '细心', '有经验', '值得复聘'];

export function ReviewModal({
  open,
  onClose,
  orderId,
  title,
  subtitle,
  role,
}: {
  open: boolean;
  onClose: () => void;
  orderId: string;
  title: string;
  subtitle: string;
  role: 'student' | 'merchant';
}) {
  const { review } = useApp();
  const { push } = useToast();
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  const options = role === 'student' ? STUDENT_TAGS : MERCHANT_TAGS;

  function toggleTag(tag: string) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag].slice(0, 4)));
  }

  function submit() {
    const result = review(orderId, role, rating, tags, comment);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    push('评价已提交', 'success');
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={subtitle}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            稍后再说
          </Button>
          <Button onClick={submit}>提交评价</Button>
        </>
      }
    >
      <div className="review-rating">
        <span>这次体验怎么样？</span>
        <div className="review-stars">
          <Stars value={rating} size={30} onChange={setRating} />
          <strong>{rating}.0</strong>
        </div>
      </div>
      <div className="review-tags">
        <span>选几个标签</span>
        <div className="tag-row">
          {options.map((tag) => (
            <button
              key={tag}
              type="button"
              className={cn('choice-tag', tags.includes(tag) && 'is-active')}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
      <label className="field">
        <span className="field-label">
          说两句 <small>选填，200 字以内</small>
        </span>
        <textarea
          rows={3}
          maxLength={200}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={role === 'student' ? '工作内容、商家沟通、结算体验都可以写。' : '这位同学的表现如何？'}
        />
      </label>
      <div className="review-note">
        <Star size={14} /> 评价仅对完成履约的双方开放，提交后不可修改。
      </div>
      {error && <div className="form-error">{error}</div>}
    </Modal>
  );
}
