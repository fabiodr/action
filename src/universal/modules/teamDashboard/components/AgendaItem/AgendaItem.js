import {css} from 'aphrodite-local-styles/no-important';
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {DragSource as dragSource} from 'react-dnd';
import FontAwesome from 'react-fontawesome';
import {createFragmentContainer} from 'react-relay';
import Avatar from 'universal/components/Avatar/Avatar';
import inAgendaGroup from 'universal/modules/meeting/helpers/inAgendaGroup';
import makeHoverFocus from 'universal/styles/helpers/makeHoverFocus';
import appTheme from 'universal/styles/theme/appTheme';
import ui from 'universal/styles/ui';
import withStyles from 'universal/styles/withStyles';
import {AGENDA_ITEM, phaseArray} from 'universal/utils/constants';
import {requestIdleCallback} from 'universal/utils/requestIdleCallback';

const taskSource = {
  beginDrag(props) {
    return {
      id: props.agendaItem.id
    };
  }
};

class AgendaItem extends Component {
  static propTypes = {
    agendaItem: PropTypes.object.isRequired,
    agendaLength: PropTypes.number.isRequired,
    canNavigate: PropTypes.bool,
    connectDragSource: PropTypes.func.isRequired,
    content: PropTypes.string,
    disabled: PropTypes.bool,
    ensureVisible: PropTypes.bool,
    handleRemove: PropTypes.func,
    idx: PropTypes.number,
    inSync: PropTypes.bool,
    isCurrent: PropTypes.bool,
    isComplete: PropTypes.bool,
    isFacilitator: PropTypes.bool,
    facilitatorPhase: PropTypes.oneOf(phaseArray),
    gotoAgendaItem: PropTypes.func,
    localPhase: PropTypes.oneOf(phaseArray),
    localPhaseItem: PropTypes.number,
    styles: PropTypes.object,
    teamMember: PropTypes.object
  };

  componentDidMount() {
    if (this.props.ensureVisible) {
      requestIdleCallback(() => {
        // does not force centering; no animation for initial load
        this.el.scrollIntoViewIfNeeded();
      });
    }
  }

  componentDidUpdate(prevProps) {
    if (!prevProps.ensureVisible && this.props.ensureVisible) {
      // without RIC only gets called ~20% of the time in Chrome64 on Ubuntu 16.04 if behavior: smooth
      requestIdleCallback(() => {
        this.el.scrollIntoView({behavior: 'smooth'});
      });
    }
  }

  el = null;

  render() {
    const {
      agendaItem,
      agendaLength,
      canNavigate,
      connectDragSource,
      disabled,
      idx,
      inSync,
      isCurrent,
      isFacilitator,
      handleRemove,
      localPhase,
      facilitatorPhase,
      gotoAgendaItem,
      localPhaseItem,
      styles
    } = this.props;
    const {content, isComplete, teamMember = {}} = agendaItem;
    const isLocal = idx + 1 === localPhaseItem;
    const canDelete = !isComplete && !isCurrent && !disabled;
    const inAgendaGroupLocal = inAgendaGroup(localPhase);
    const inAgendaGroupFacilitator = inAgendaGroup(facilitatorPhase);

    const rootStyles = css(
      styles.root,
      inAgendaGroupLocal && isLocal && styles.itemLocal,
      inAgendaGroupFacilitator && isFacilitator && !inSync && styles.itemNotInSync,
      isComplete && styles.processed,
      disabled && styles.rootDisabled,
      isComplete && disabled && styles.processedDisabled
    );

    const contentStyles = css(
      styles.link,
      isComplete && styles.strikethrough,
      canNavigate && styles.canNavigate,
      inAgendaGroupLocal && isLocal && styles.descLocal,
      inAgendaGroupFacilitator && isFacilitator && !inSync && styles.descNotInSync
    );

    const delStyles = css(
      styles.del,
      disabled && styles.delDisabled,
      // we can make the position of the del (x) more centered when there’s a low number of agenda items
      agendaLength < 10 ? styles.delBumpRight : styles.delBumpLeft
    );

    const indexStyles = css(
      styles.index,
      disabled && styles.indexDisabled
    );

    return connectDragSource(
      <div className={rootStyles} title={content} ref={(el) => { this.el = el; }}>
        {canDelete &&
        <div className={delStyles} onClick={handleRemove}>
          <FontAwesome name="times-circle" style={{lineHeight: 'inherit'}} />
        </div>
        }
        <div className={indexStyles}>{idx + 1}.</div>
        <div className={css(styles.content)} onClick={gotoAgendaItem}>
          <a className={contentStyles}>{content}</a>”
        </div>
        <div className={css(styles.author)}>
          <Avatar hasBadge={false} picture={teamMember.picture} size="smallest" />
        </div>
      </div>
    );
  }
}

const lineHeight = '1.5rem';

const styleThunk = () => ({
  root: {
    backgroundColor: 'transparent',
    color: ui.colorText,
    display: 'flex',
    fontSize: appTheme.typography.s3,
    padding: '.5rem .5rem .5rem 0',
    position: 'relative',
    width: '100%',

    ':hover': {
      backgroundColor: appTheme.palette.light50l
    },
    ':focus': {
      backgroundColor: appTheme.palette.light50l
    },
    ':hover > div': {
      opacity: 1
    },

    '::after': {
      backgroundColor: 'transparent',
      borderRadius: '100%',
      content: '""',
      display: 'block',
      left: '.875rem',
      marginTop: '-.1875rem',
      position: 'absolute',
      height: '.375rem',
      top: '50%',
      transition: 'opacity .1s ease-in',
      width: '.375rem'
    }
  },

  rootDisabled: {
    ':hover': {
      backgroundColor: 'transparent'
    },
    ':focus': {
      backgroundColor: 'transparent'
    }
  },

  del: {
    color: appTheme.palette.warm,
    cursor: 'pointer',
    height: '1.5rem',
    left: ui.meetingSidebarGutter,
    lineHeight,
    opacity: 0,
    position: 'absolute',
    textAlign: 'center',
    top: '.5rem',
    transition: 'opacity .1s ease-in',
    width: ui.iconSize
  },

  delDisabled: {
    opacity: '0 !important'
  },

  delBumpLeft: {
    left: ui.meetingSidebarGutter
  },

  delBumpRight: {
    left: '.8125rem'
  },

  content: {
    fontSize: appTheme.typography.s3,
    flex: 1,
    fontWeight: 400,
    lineHeight,
    position: 'relative',
    wordBreak: 'break-word',

    '::before': {
      content: '"“"',
      display: 'block',
      position: 'absolute',
      right: '100%',
      textAlign: 'right',
      width: '1rem'
    }
  },

  link: {
    color: ui.colorText,

    ...makeHoverFocus({
      color: ui.colorText,
      textDecoration: 'none'
    })
  },

  itemLocal: {
    backgroundColor: ui.navMenuLightBackgroundColorActive,
    boxShadow: `inset 3px 0 0 ${ui.palette.mid}`,
    color: ui.colorText
  },

  descLocal: {
    color: ui.linkColor,
    ':hover': {
      color: ui.linkColorHover
    },
    ':focus': {
      color: ui.linkColorHover
    }
  },

  itemFacilitator: {
    // Define
  },

  itemNotInSync: {
    color: ui.palette.warm,
    '::after': {
      backgroundColor: ui.palette.warm
    },
    ':hover::after': {
      opacity: 0
    }
  },

  descFacilitator: {
    color: ui.linkColor,
    ':hover': {
      color: ui.linkColorHover
    },
    ':focus': {
      color: ui.linkColorHover
    }
  },

  descNotInSync: {
    color: ui.palette.warm,
    ':hover': {
      color: ui.palette.warm
    },
    ':focus': {
      color: ui.palette.warm
    }
  },

  index: {
    fontWeight: 400,
    height: '1.5rem',
    lineHeight,
    opacity: '.5',
    paddingRight: '.75rem',
    textAlign: 'right',
    width: '3.75rem'
  },

  indexDisabled: {
    opacity: '.5 !important'
  },

  author: {
    textAlign: 'right',
    width: '2rem'
  },

  active: {
    color: appTheme.palette.warm
  },

  processed: {
    opacity: '.5',

    ':hover': {
      opacity: '1'
    }
  },

  processedDisabled: {
    ':hover': {
      opacity: '.5'
    }
  },

  strikethrough: {
    textDecoration: 'line-through',

    ...makeHoverFocus({
      textDecoration: 'line-through'
    })
  },

  canNavigate: {
    color: ui.palette.mid,

    ...makeHoverFocus({
      color: ui.palette.mid,
      cursor: 'pointer',
      textDecoration: 'underline'
    })
  }
});

const dragSourceCb = (connectSource, monitor) => ({
  connectDragSource: connectSource.dragSource(),
  connectDragPreview: connectSource.dragPreview(),
  isDragging: monitor.isDragging()
});

export default createFragmentContainer(
  dragSource(AGENDA_ITEM, taskSource, dragSourceCb)(
    withStyles(styleThunk)(AgendaItem)
  ),
  graphql`
    fragment AgendaItem_agendaItem on AgendaItem {
      id
      content
      isComplete
      teamMember {
        picture
      }
    }`
);
